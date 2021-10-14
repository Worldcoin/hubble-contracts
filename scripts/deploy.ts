import { ethers } from "ethers";
import { deployAndWriteGenesis } from "../ts/deploy";
import { DeploymentParameters } from "../ts/interfaces";
import fs from "fs";
import { PRODUCTION_PARAMS } from "../ts/constants";
import { StateTree } from "../ts/stateTree";
import { Group } from "../ts/factory";

const { url, root, key, input, output, numPubkeys, pubkeyMnemonic } =
    require("minimist")(process.argv.slice(2), {
        string: [
            "url",
            "root",
            "key",
            "input",
            "output",
            "numPubkeys",
            "pubkeyMnemonic",
        ],
    });
/*
    Note separate pubkeys with commas
    > npm run deploy -- --url http://localhost:8545 \
    --root 0x309976060df37ed6961ebd53027fe0c45d3cbbbdfc30a5039e86b2a7aa7fed6e

    You can specify an Eth1 private key
    > npm run deploy -- --key 0xYourPrivateKey

    You can specify an initial number of BLS public keys to register and their mnemonic seed (hardhat mnemonic default)
    > npm run deploy -- --numPubkeys 32 \
    --pubkeyMnemonic 'focus hood pipe manual below record fly pole corn remember define slice kitchen capable search'

    You can use a custom parameters.json
    > npm run deploy -- --input parameters.json --output ../hubbe-commander/genesis.json
*/

function validateArgv() {
    if (pubkeyMnemonic && !numPubkeys) {
        throw new Error(
            "numPubkeys must be specified if a pubkeyMnemonic is provided"
        );
    }
}

function getDefaultGenesisRoot(parameters: DeploymentParameters) {
    const stateTree = StateTree.new(parameters.MAX_DEPTH);
    // An completely empty genesis state
    // Can add states here
    return stateTree.root;
}

async function main() {
    validateArgv();

    const provider = new ethers.providers.JsonRpcProvider(
        url ?? "http://localhost:8545"
    );
    const signer = key
        ? new ethers.Wallet(key).connect(provider)
        : provider.getSigner();

    const parameters = input
        ? JSON.parse(fs.readFileSync(input).toString())
        : PRODUCTION_PARAMS;

    parameters.GENESIS_STATE_ROOT = root || getDefaultGenesisRoot(parameters);
    console.log("Deploy with parameters", parameters);

    const { blsAccountRegistry } = await deployAndWriteGenesis(
        signer,
        parameters,
        output
    );

    if (numPubkeys) {
        console.log(
            `Registering ${numPubkeys} pubkeys. Custom mnemonic: ${!!pubkeyMnemonic}`
        );
        const group = Group.new({
            n: pubkeyMnemonic,
            mnemonic: pubkeyMnemonic,
        });
        // Convert this to batch register once implemented
        for (const user of group.userIterator()) {
            await blsAccountRegistry.register(user.pubkey);
        }
    }
}

main()
    .then(() => {
        console.log("Deployment complete");
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
