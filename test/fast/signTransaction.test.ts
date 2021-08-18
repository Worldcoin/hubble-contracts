import { TxCreate2Transfer, TxTransfer } from "../../ts/tx";
import { BlsSigner } from "../../ts/blsSigner";
import { utils } from "ethers";
import { ethers } from "hardhat";
import { deployKeyless } from "../../ts/deployment/deploy";
import * as mcl from "../../ts/mcl";
import { hashToPoint } from "../../ts/mcl";
import { TestBlsFactory } from "../../types/ethers-contracts";
import { TestBls } from "../../types/ethers-contracts/TestBls";
import { expect } from "chai";

describe("Methods for signing transactions", function() {
    const domain = utils.arrayify(utils.id("some domain"));

    let bls: TestBls;
    let signer: BlsSigner;

    before("Deploy TestBLS contract", async function() {
        const ethersSigner = ethers.provider.getSigner();
        await deployKeyless(ethersSigner, false, {
            PairingGasEstimators: true
        });
        const [deployer] = await ethers.getSigners();
        bls = await new TestBlsFactory(deployer).deploy();
        await bls.deployed();
    });

    beforeEach("Create signer", async function() {
        await mcl.init();
        signer = BlsSigner.new(domain);
    });

    describe("signTransfer", function() {
        it("returns positive checkResult for valid signature", async function() {
            const transfer = TxTransfer.rand();
            const message = transfer.message();
            const signature = signer.sign(message);

            const messagePoint = hashToPoint(message, domain);

            const { 0: checkResult, 1: callSuccess } = await bls.verifySingle(
                mcl.g1ToHex(signature.mcl),
                signer.pubkey,
                mcl.g1ToHex(messagePoint)
            );

            expect(checkResult).to.be.true;
            expect(callSuccess).to.be.true;
        });

        it("returns negative checkResult for invalid signature", async function() {
            const otherSigner = BlsSigner.new(domain);

            const transfer = TxTransfer.rand();
            const message = transfer.message();
            const signature = otherSigner.sign(message);

            const messagePoint = hashToPoint(message, domain);

            const { 0: checkResult, 1: callSuccess } = await bls.verifySingle(
                mcl.g1ToHex(signature.mcl),
                signer.pubkey,
                mcl.g1ToHex(messagePoint)
            );

            expect(checkResult).to.be.false;
            expect(callSuccess).to.be.true;
        });
    });

    describe("signCreate2Transfer", function() {
        it("returns positive checkResult for valid signature", async function() {
            const c2t = TxCreate2Transfer.rand();
            const message = c2t.message();
            const signature = signer.sign(message);

            const messagePoint = hashToPoint(message, domain);

            const { 0: checkResult, 1: callSuccess } = await bls.verifySingle(
                mcl.g1ToHex(signature.mcl),
                signer.pubkey,
                mcl.g1ToHex(messagePoint)
            );

            expect(checkResult).to.be.true;
            expect(callSuccess).to.be.true;
        });

        it("returns negative checkResult for invalid signature", async function() {
            const otherSigner = BlsSigner.new(domain);

            const c2t = TxCreate2Transfer.rand();
            const message = c2t.message();
            const signature = otherSigner.sign(message);

            const messagePoint = hashToPoint(message, domain);

            const { 0: checkResult, 1: callSuccess } = await bls.verifySingle(
                mcl.g1ToHex(signature.mcl),
                signer.pubkey,
                mcl.g1ToHex(messagePoint)
            );

            expect(checkResult).to.be.false;
            expect(callSuccess).to.be.true;
        });
    });
});
