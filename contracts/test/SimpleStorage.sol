// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract SimpleStorage {
    uint256 value = 0;

    function setValue(uint256 _value) external {
        value = _value;
    }

    function getValue() external view returns (uint256) {
        return value;
    }
}
