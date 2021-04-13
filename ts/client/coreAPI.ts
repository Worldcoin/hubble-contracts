import { Genesis } from "../genesis";
import { Pubkey } from "../pubkey";
import { State } from "../state";
import { DepositPool } from "./features/deposit";
import { StorageManager } from "./storageEngine";
import { providers, Signer } from "ethers";
import { allContracts } from "../allContractsInterfaces";

export class SyncedPoint {
    constructor(public blockNumber: number, public batchID: number) {}

    private validateBlockNumber(blockNumber: number) {
        if (blockNumber < this.blockNumber)
            throw new Error(
                `new block number is smaller  old ${this.blockNumber}  new ${blockNumber}`
            );
    }
    private validateBatchID(batchID: number) {
        if (batchID < this.batchID)
            throw new Error(
                `new batchID is smaller  old ${this.batchID}  new ${batchID}`
            );
    }

    update(blockNumber: number, batchID: number) {
        this.validateBlockNumber(blockNumber);
        this.validateBatchID(batchID);

        this.blockNumber = blockNumber;
        this.batchID = batchID;
    }

    bump(blockNumber: number) {
        this.validateBlockNumber(blockNumber);
        this.batchID++;
        this.blockNumber = blockNumber;
    }
}

export interface ICoreAPI {
    getlatestBatchID(): Promise<number>;
    getState(stateID: number): Promise<State>;
    updateState(stateID: number, state: State): Promise<void>;
    getPubkey(pubkeyID: number): Promise<Pubkey>;
    updatePubkey(pubkeyID: number, pubkey: Pubkey): Promise<void>;
}

export class CoreAPI implements ICoreAPI {
    private constructor(
        public readonly l2Storage: StorageManager,
        private readonly genesis: Genesis,
        public readonly depositPool: DepositPool,
        private readonly provider: providers.Provider,
        public readonly contracts: allContracts,
        public readonly syncpoint: SyncedPoint
    ) {}

    static new(
        l2Storage: StorageManager,
        genesis: Genesis,
        provider: providers.Provider,
        signer: Signer
    ) {
        const depositPool = new DepositPool(
            genesis.parameters.MAX_DEPOSIT_SUBTREE_DEPTH
        );
        const contracts = genesis.getContracts(signer);
        const syncedPoint = new SyncedPoint(
            genesis.auxiliary.genesisEth1Block,
            0
        );
        return new this(
            l2Storage,
            genesis,
            depositPool,
            provider,
            contracts,
            syncedPoint
        );
    }

    get rollup() {
        return this.contracts.rollup;
    }

    get parameters() {
        return this.genesis.parameters;
    }

    getGenesisRoot() {
        return this.genesis.parameters.GENESIS_STATE_ROOT as string;
    }
    async getBlockNumber() {
        return await this.provider.getBlockNumber();
    }
    async getlatestBatchID() {
        return Number(await this.rollup.nextBatchID()) - 1;
    }

    async getState(stateID: number): Promise<State> {
        return await this.l2Storage.state.get(stateID);
    }

    async updateState(stateID: number, state: State): Promise<void> {
        await this.l2Storage.state.update(stateID, state);
        await this.l2Storage.state.commit();
    }
    async getPubkey(pubkeyID: number): Promise<Pubkey> {
        return this.l2Storage.pubkey.get(pubkeyID);
    }
    async updatePubkey(pubkeyID: number, pubkey: Pubkey): Promise<void> {
        await this.l2Storage.pubkey.update(pubkeyID, pubkey);
        await this.l2Storage.pubkey.commit();
    }
}
