import { assert, expect } from "chai";
import { ethers } from "hardhat";
import { TESTING_PARAMS } from "../../ts/constants";
import { DeploymentParameters } from "../../ts/interfaces";
import { randHex } from "../../ts/utils";
import {
    MockDepositManagerFactory,
    TestRollupFactory,
} from "../../types/ethers-contracts";
import { MockDepositManager } from "../../types/ethers-contracts/MockDepositManager";
import { TestRollup } from "../../types/ethers-contracts/TestRollup";

describe("Rollback", function () {
    let rollup: TestRollup;
    let depositManager: MockDepositManager;
    const param = TESTING_PARAMS;
    const numOfBatches = 250;

    async function getTipBatchID() {
        return Number(await rollup.nextBatchID()) - 1;
    }
    async function setup(param: DeploymentParameters) {
        const [signer] = await ethers.getSigners();
        depositManager = await new MockDepositManagerFactory(signer).deploy();
        rollup = await new TestRollupFactory(signer).deploy(
            depositManager.address,
            param.STAKE_AMOUNT,
            param.BLOCKS_TO_FINALISE,
            param.MIN_GAS_LEFT
        );
        for (let i = 0; i < numOfBatches; i++) {
            if (i % 2 == 0) {
                await rollup.submitDeposits(randHex(32), {
                    value: param.STAKE_AMOUNT,
                });
            } else {
                await rollup.submitDummyBatch({ value: param.STAKE_AMOUNT });
            }
        }
    }

    beforeEach(async function () {
        await setup(param);
    });
    it("Test rollback exactly 1 batch", async function () {
        assert.equal(await getTipBatchID(), numOfBatches - 1);
        // Set gasLimit manually since estimateGas gets one that can slash no batch.
        const tx = await rollup.testRollback(numOfBatches - 1, {
            gasLimit: 1000000,
        });
        const [status] = await rollup.queryFilter(
            rollup.filters.RollbackStatus(null, null, null),
            tx.blockHash
        );

        assert.equal(await getTipBatchID(), numOfBatches - 2);
        assert.equal(Number(await rollup.invalidBatchMarker()), 0);
        assert.isTrue(status.args?.completed);
        assert.equal(Number(status.args?.startID), numOfBatches - 1);
        assert.equal(Number(status.args?.nDeleted), 1);
    });
    it("Test rollback exactly 0 batch", async function () {
        // Resetup with a high minGasLeft to skip rollback loop
        const param2 = { ...TESTING_PARAMS, MIN_GAS_LEFT: 12000000 };
        await setup(param2);
        const gasleft = await rollup.callStatic.testRollback(1);
        console.log("Gas usage out of the loop", gasleft.toNumber());
        const tx = await rollup.testRollback(1);
        const [status] = await rollup.queryFilter(
            rollup.filters.RollbackStatus(null, null, null),
            tx.blockHash
        );
        assert.isFalse(status.args?.completed);
        assert.equal(Number(status.args?.startID), await getTipBatchID());
        assert.equal(Number(status.args?.nDeleted), 0);
    });

    it("Test a long rollback", async function () {
        const nBatches = await getTipBatchID();
        const tx = await rollup.testRollback(1, { gasLimit: 9500000 });

        const [status] = await rollup.queryFilter(
            rollup.filters.RollbackStatus(null, null, null),
            tx.blockHash
        );
        // Want to roll all the way to the start
        assert.isTrue(status.args?.completed);
        assert.equal(Number(status.args?.startID), numOfBatches - 1);
        assert.equal(Number(status.args?.nDeleted), numOfBatches - 1);
        assert.equal(await getTipBatchID(), 0);
        const gasUsed = (await tx.wait()).gasUsed.toNumber();
        console.log(`Rolled back ${nBatches} batches with ${gasUsed} gas`);
        console.log("gas per batch rolled back", gasUsed / nBatches);
    });
    it("Test keep rolling back", async function () {
        const tipBatchID = numOfBatches - 1;
        const badBatchID = tipBatchID - 20;
        const goodBatchID = badBatchID - 1;

        const tx0 = await rollup.testRollback(badBatchID, { gasLimit: 500000 });
        expect(await getTipBatchID()).to.be.greaterThan(badBatchID);
        const [status0] = await rollup.queryFilter(
            rollup.filters.RollbackStatus(null, null, null),
            tx0.blockHash
        );
        assert.isFalse(status0.args?.completed);
        assert.equal(Number(status0.args?.startID), tipBatchID);

        const tx1 = await rollup.keepRollingBack({ gasLimit: 8000000 });
        const [status1] = await rollup.queryFilter(
            rollup.filters.RollbackStatus(null, null, null),
            tx1.blockHash
        );
        assert.isTrue(status1.args?.completed);
        assert.equal(Number(await rollup.invalidBatchMarker()), 0);
        assert.equal(await getTipBatchID(), goodBatchID);
    });
    it("Test rollback with deposits", async function () {
        const badBatchID = await getTipBatchID();
        const [subtree1, subtree2, subtree3] = [
            randHex(32),
            randHex(32),
            randHex(32),
        ];
        await rollup.submitDeposits(subtree1, { value: param.STAKE_AMOUNT });
        await rollup.submitDummyBatch({ value: param.STAKE_AMOUNT });
        await rollup.submitDeposits(subtree2, { value: param.STAKE_AMOUNT });
        await rollup.submitDummyBatch({ value: param.STAKE_AMOUNT });
        await rollup.submitDeposits(subtree3, { value: param.STAKE_AMOUNT });
        const tx = await rollup.testRollback(badBatchID, { gasLimit: 1000000 });
        const events = await depositManager.queryFilter(
            depositManager.filters.DepositSubTreeReady(null, null),
            tx.blockHash
        );
        assert.equal(events.length, 3);
        const [event1, event2, event3] = events;
        // Since we are rolling "back", the events are emitted in reverse order
        assert.equal(event1.args?.subtreeRoot, subtree3);
        assert.equal(event2.args?.subtreeRoot, subtree2);
        assert.equal(event3.args?.subtreeRoot, subtree1);
    });
});
