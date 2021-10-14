import { BigNumber } from "@ethersproject/bignumber";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import { TransferOffchainTx } from "../../ts/client/features/transfer";
import { Status } from "../../ts/client/storageEngine/transactions/constants";
import { TransactionStorage } from "../../ts/client/storageEngine/transactions/interfaces";
import { TransactionMemoryStorage } from "../../ts/client/storageEngine/transactions/memory";
import {
    StatusTransitionInvalid,
    TransactionAlreadyExists,
    TransactionDoesNotExist,
} from "../../ts/exceptions";

chai.use(chaiAsPromised);

describe("TransactionMemoryStorage", () => {
    let storage: TransactionStorage;

    beforeEach(function () {
        storage = new TransactionMemoryStorage();
    });

    describe("get", () => {
        it("returns undefined is transaction has not been added", async function () {
            assert.isUndefined(await storage.get("abc123"));
        });

        it("returns the correct transaction", async function () {
            const fee = BigNumber.from(1);
            const txns = [
                new TransferOffchainTx(0, 1, BigNumber.from(123), fee, 0),
                new TransferOffchainTx(2, 3, BigNumber.from(456), fee, 0),
            ];

            await Promise.all(txns.map(async (t) => storage.pending(t)));

            assert.equal(storage.count(), 2);

            for (const t of txns) {
                const txnStatus = await storage.get(t.message());
                assert.equal(txnStatus?.transaction, t);
                const txnStatusFromTx = await storage.get(t);
                assert.equal(txnStatusFromTx?.transaction, t);
            }
        });
    });

    describe("transaction lifecycle", () => {
        describe("succeeds", () => {
            it("properly transitions to finalized", async function () {
                const txn = new TransferOffchainTx(
                    4,
                    5,
                    BigNumber.from(1337),
                    BigNumber.from(42),
                    0
                );
                const txnMsg = txn.message();

                const pendingStatus = await storage.pending(txn);
                assert.equal(pendingStatus.transaction, txn);
                assert.equal(pendingStatus.status, Status.Pending);

                const meta = {
                    batchID: 789,
                    l1TxnHash: "def456",
                    l1BlockIncluded: 101112,
                };
                const submittedStatus = await storage.submitted(txnMsg, meta);
                assert.equal(submittedStatus.transaction, txn);
                assert.equal(submittedStatus.status, Status.Submitted);
                assert.equal(submittedStatus.batchID, meta.batchID);
                assert.equal(submittedStatus.l1TxnHash, meta.l1TxnHash);
                assert.equal(
                    submittedStatus.l1BlockIncluded,
                    meta.l1BlockIncluded
                );

                const finalizedStatus = await storage.finalized(txnMsg);
                assert.equal(finalizedStatus.transaction, txn);
                assert.equal(finalizedStatus.status, Status.Finalized);
                assert.equal(finalizedStatus.batchID, meta.batchID);
                assert.equal(finalizedStatus.l1TxnHash, meta.l1TxnHash);
                assert.equal(
                    finalizedStatus.l1BlockIncluded,
                    meta.l1BlockIncluded
                );
            });

            it("properly transitions to failed state from pending", async function () {
                const txn = new TransferOffchainTx(
                    10,
                    11,
                    BigNumber.from(10101),
                    BigNumber.from(101),
                    0
                );
                await storage.pending(txn);

                const detail = "whoops";
                const failedStatus = await storage.failed(
                    txn.message(),
                    detail
                );
                assert.equal(failedStatus.transaction, txn);
                assert.equal(failedStatus.status, Status.Failed);
                assert.equal(failedStatus.detail, detail);
            });

            it("properly transitions to failed state from submitted", async function () {
                const txn = new TransferOffchainTx(
                    11,
                    12,
                    BigNumber.from(20202),
                    BigNumber.from(202),
                    0
                );
                await storage.pending(txn);
                const meta = {
                    batchID: 111,
                    l1TxnHash: "aaa111",
                    l1BlockIncluded: 111111,
                };
                await storage.submitted(txn.message(), meta);

                const detail = "uh-oh";
                const failedStatus = await storage.failed(
                    txn.message(),
                    detail
                );
                assert.equal(failedStatus.transaction, txn);
                assert.equal(failedStatus.status, Status.Failed);
                assert.equal(failedStatus.detail, detail);
            });
        });

        describe("fails", () => {
            it("when already added", async function () {
                const txn = new TransferOffchainTx(
                    6,
                    7,
                    BigNumber.from(111),
                    BigNumber.from(22),
                    0
                );
                await storage.pending(txn);
                await assert.isRejected(
                    storage.pending(txn),
                    TransactionAlreadyExists
                );
            });

            it("when not found", async function () {
                const missingMessage = "ghi789";
                const meta = {
                    batchID: 321,
                    l1TxnHash: "zyx987",
                    l1BlockIncluded: 131415,
                };
                await assert.isRejected(
                    storage.submitted(missingMessage, meta),
                    TransactionDoesNotExist
                );
                await assert.isRejected(
                    storage.finalized(missingMessage),
                    TransactionDoesNotExist
                );
                await assert.isRejected(
                    storage.failed(missingMessage, "derp"),
                    TransactionDoesNotExist
                );
            });

            it("when transitioning to an improper state", async function () {
                const txn = new TransferOffchainTx(
                    9,
                    0,
                    BigNumber.from(420),
                    BigNumber.from(69),
                    0
                );
                const txnMsg = txn.message();
                await storage.pending(txn);

                await assert.isRejected(
                    storage.finalized(txnMsg),
                    StatusTransitionInvalid
                );

                const meta = {
                    batchID: 654,
                    l1TxnHash: "xyz789",
                    l1BlockIncluded: 161718,
                };
                await storage.submitted(txnMsg, meta);

                await assert.isRejected(
                    storage.submitted(txnMsg, meta),
                    StatusTransitionInvalid
                );

                await storage.finalized(txnMsg);
                await assert.isRejected(
                    storage.finalized(txnMsg),
                    StatusTransitionInvalid
                );
                await assert.isRejected(
                    storage.submitted(txnMsg, meta),
                    StatusTransitionInvalid
                );
                await assert.isRejected(
                    storage.failed(txnMsg, ""),
                    StatusTransitionInvalid
                );
            });
        });
    });

    describe("sync", () => {
        it("fails if transaction already exists", async function () {
            const txn = new TransferOffchainTx(
                111,
                112,
                BigNumber.from(421),
                BigNumber.from(70),
                0
            );
            await storage.pending(txn);

            const meta = {
                finalized: false,
                batchID: 765,
                l1TxnHash: "abc980",
                l1BlockIncluded: 11112222,
            };

            await assert.isRejected(
                storage.sync(txn, meta),
                TransactionAlreadyExists
            );
        });

        it("successfully syncs a submitted transaction", async function () {
            const txn = new TransferOffchainTx(
                111,
                222,
                BigNumber.from(543),
                BigNumber.from(65),
                1
            );
            const meta = {
                batchID: 999,
                l1TxnHash: "zzz999",
                l1BlockIncluded: 999000,
            };

            const status = await storage.sync(txn, {
                ...meta,
                finalized: false,
            });

            assert.equal(status.transaction, txn);
            assert.equal(status.status, Status.Submitted);
            assert.equal(status.batchID, meta.batchID);
            assert.equal(status.l1TxnHash, meta.l1TxnHash);
            assert.equal(status.l1BlockIncluded, meta.l1BlockIncluded);
        });

        it("successfully syncs a finalized transaction", async function () {
            const txn = new TransferOffchainTx(
                111,
                333,
                BigNumber.from(345),
                BigNumber.from(56),
                0
            );
            const meta = {
                batchID: 111,
                l1TxnHash: "aaa111",
                l1BlockIncluded: 111,
            };

            const status = await storage.sync(txn, {
                ...meta,
                finalized: true,
            });

            assert.equal(status.transaction, txn);
            assert.equal(status.status, Status.Finalized);
            assert.equal(status.batchID, meta.batchID);
            assert.equal(status.l1TxnHash, meta.l1TxnHash);
            assert.equal(status.l1BlockIncluded, meta.l1BlockIncluded);
        });
    });
});
