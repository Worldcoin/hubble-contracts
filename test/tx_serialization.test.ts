import { TestTxFactory } from "../types/ethers-contracts/TestTxFactory";
import { TestTx } from "../types/ethers-contracts/TestTx";
import {
    TxTransfer,
    serialize,
    TxCreate,
    TxBurnConsent,
    TxBurnExecution
} from "../ts/tx";
import { assert } from "chai";
import { ethers } from "@nomiclabs/buidler";

describe("Tx Serialization", async () => {
    let c: TestTx;
    before(async function() {
        const [signer, ...rest] = await ethers.getSigners();
        c = await new TestTxFactory(signer).deploy();
    });

    it("parse transfer transaction", async function() {
        const txSize = 16;
        const txs: TxTransfer[] = [];
        for (let i = 0; i < txSize; i++) {
            txs.push(TxTransfer.rand());
        }
        const { serialized } = serialize(txs);
        assert.equal(txSize, (await c.transfer_size(serialized)).toNumber());
        assert.isFalse(await c.transfer_hasExcessData(serialized));
        for (let i = 0; i < txSize; i++) {
            const fromIndex = await c.transfer_fromIndexOf(serialized, i);
            const toIndex = await c.transfer_toIndexOf(serialized, i);
            const amount = await c.transfer_amountOf(serialized, i);
            const fee = await c.transfer_feeOf(serialized, i);

            assert.equal(fromIndex.toNumber(), txs[i].fromIndex);
            assert.equal(toIndex.toNumber(), txs[i].toIndex);
            assert.equal(amount.toNumber(), txs[i].amount);
            assert.equal(fee.toNumber(), txs[i].fee);
            const decoded = await c.transfer_decode(serialized, i);
            assert.equal(
                decoded.fromIndex.toString(),
                txs[i].fromIndex.toString()
            );
            assert.equal(decoded.toIndex.toString(), txs[i].toIndex.toString());
            assert.equal(decoded.amount.toString(), txs[i].amount.toString());
        }
    });
    it("serialize transfer transaction", async function() {
        const txSize = 16;
        const txs: TxTransfer[] = [];
        for (let i = 0; i < txSize; i++) {
            const tx = TxTransfer.rand();
            txs.push(tx);
        }
        const { serialized } = serialize(txs);
        const _serialized = await c.transfer_serialize(txs);
        assert.equal(serialized, _serialized);
    });
    it("transfer trasaction casting", async function() {
        const txSize = 16;
        const txs = [];
        const txsInBytes = [];
        for (let i = 0; i < txSize; i++) {
            const tx = TxTransfer.rand();
            const extended = tx.extended();
            const bytes = await c.transfer_bytesFromEncoded(extended);
            txs.push(tx);
            txsInBytes.push(bytes);
        }
        const { serialized } = serialize(txs);
        const _serialized = await c.transfer_serializeFromEncoded(txsInBytes);
        assert.equal(serialized, _serialized);
    });
    it("parse create transaction", async function() {
        const txSize = 16;
        const txs: TxCreate[] = [];
        for (let i = 0; i < txSize; i++) {
            txs.push(TxCreate.rand());
        }
        const { serialized } = serialize(txs);
        assert.equal(txSize, (await c.create_size(serialized)).toNumber());
        assert.isFalse(await c.create_hasExcessData(serialized));
        for (let i = 0; i < txSize; i++) {
            const accountID = (
                await c.create_accountIdOf(serialized, i)
            ).toNumber();
            const stateID = (
                await c.create_stateIdOf(serialized, i)
            ).toNumber();
            const token = (await c.create_tokenOf(serialized, i)).toNumber();
            assert.equal(accountID, txs[i].accountID);
            assert.equal(stateID, txs[i].stateID);
            assert.equal(token, txs[i].tokenType);
        }
    });
    it("serialize create transaction", async function() {
        const txSize = 16;
        const txs: TxCreate[] = [];
        for (let i = 0; i < txSize; i++) {
            const tx = TxCreate.rand();
            txs.push(tx);
        }
        const { serialized } = serialize(txs);
        const _serialized = await c.create_serialize(txs);
        assert.equal(serialized, _serialized);
    });
    it("create transaction casting", async function() {
        const txSize = 16;
        const txs = [];
        const txsInBytes = [];
        for (let i = 0; i < txSize; i++) {
            const tx = TxCreate.rand();
            const extended = tx.extended();
            const bytes = await c.create_bytesFromEncoded(extended);
            txs.push(tx);
            txsInBytes.push(bytes);
        }
        const { serialized } = serialize(txs);
        const _serialized = await c.create_serializeFromEncoded(txsInBytes);
        assert.equal(serialized, _serialized);
    });
    it("parse burn consent transaction", async function() {
        const txSize = 16;
        const txs: TxBurnConsent[] = [];
        for (let i = 0; i < txSize; i++) {
            txs.push(TxBurnConsent.rand());
        }
        const { serialized } = serialize(txs);
        assert.equal(txSize, (await c.burnConsent_size(serialized)).toNumber());
        assert.isFalse(await c.burnConsent_hasExcessData(serialized));
        for (let i = 0; i < txSize; i++) {
            const fromIndex = (
                await c.burnConsent_fromIndexOf(serialized, i)
            ).toNumber();
            const amount = (
                await c.burnConsent_amountOf(serialized, i)
            ).toNumber();
            assert.equal(fromIndex, txs[i].fromIndex);
            assert.equal(amount, txs[i].amount);
        }
    });
    it("serialize burn consent transaction", async function() {
        const txSize = 16;
        const txs: TxBurnConsent[] = [];
        for (let i = 0; i < txSize; i++) {
            const tx = TxBurnConsent.rand();
            txs.push(tx);
        }
        const { serialized } = serialize(txs);
        const _serialized = await c.burnConsent_serialize(txs);
        assert.equal(serialized, _serialized);
    });
    it("burn consent transaction casting", async function() {
        const txSize = 16;
        const txs = [];
        const txsInBytes = [];
        for (let i = 0; i < txSize; i++) {
            const tx = TxBurnConsent.rand();
            const extended = tx.extended();
            const bytes = await c.burnConsent_bytesFromEncoded(extended);
            txs.push(tx);
            txsInBytes.push(bytes);
        }
        const { serialized } = serialize(txs);
        const _serialized = await c.burnConsent_serializeFromEncoded(
            txsInBytes
        );
        assert.equal(serialized, _serialized);
    });
    it("parse burn execution transaction", async function() {
        const txSize = 16;
        const txs: TxBurnExecution[] = [];
        for (let i = 0; i < txSize; i++) {
            txs.push(TxBurnExecution.rand());
        }
        const { serialized } = serialize(txs);
        assert.equal(
            txSize,
            (await c.burnExecution_size(serialized)).toNumber()
        );
        assert.isFalse(await c.burnExecution_hasExcessData(serialized));
        for (let i = 0; i < txSize; i++) {
            const fromIndex = (
                await c.burnExecution_fromIndexOf(serialized, i)
            ).toNumber();
            assert.equal(fromIndex, txs[i].fromIndex);
        }
    });
    it("serialize burn execution transaction", async function() {
        const txSize = 16;
        const txs: TxBurnExecution[] = [];
        for (let i = 0; i < txSize; i++) {
            const tx = TxBurnExecution.rand();
            txs.push(tx);
        }
        const { serialized } = serialize(txs);
        const _serialized = await c.burnExecution_serialize(txs);
        assert.equal(serialized, _serialized);
    });
    it("burn execution transaction casting", async function() {
        const txSize = 16;
        const txs = [];
        const txsInBytes = [];
        for (let i = 0; i < txSize; i++) {
            const tx = TxBurnExecution.rand();
            const extended = tx.extended();
            const bytes = await c.burnExecution_bytesFromEncoded(extended);
            txs.push(tx);
            txsInBytes.push(bytes);
        }
        const { serialized } = serialize(txs);
        const _serialized = await c.burnExecution_serializeFromEncoded(
            txsInBytes
        );
        assert.equal(serialized, _serialized);
    });
});
