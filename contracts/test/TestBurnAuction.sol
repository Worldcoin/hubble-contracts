// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Chooser } from "../proposers/Chooser.sol";
import { BurnAuction } from "../proposers/BurnAuction.sol";

contract MockRollup {
    Chooser public chooser;
    // `submitBatch` must not be view for our tests, this removes compiler warning.
    event BatchSubmitted();

    constructor(Chooser _chooser) {
        chooser = _chooser;
    }

    //
    function submitBatch() external {
        require(chooser.getProposer() == msg.sender, "Invalid proposer");
        emit BatchSubmitted();
    }
}

contract TestBurnAuction is BurnAuction {
    constructor(address payable donationAddress, uint256 donationNumerator)
        BurnAuction(donationAddress, donationNumerator)
    {}

    uint256 public blockNumber = 0;

    function setBlockNumber(uint256 _blockNumber) external {
        blockNumber = _blockNumber;
    }

    function getBlockNumber() public view override returns (uint256) {
        return blockNumber;
    }
}
