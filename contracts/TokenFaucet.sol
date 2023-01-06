// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./gERC20.sol";

contract TokenFaucet is gERC20 {
    uint256 TOKEN_CLAIM_ALLOWANCE = 10 ether;

    event Claim(address sender, uint256 amount);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _forwarder
    ) gERC20(_name, _symbol, _decimals) {
        _setTrustedForwarder(_forwarder);
    }

    function claim() public returns (bool) {
        address sender = _msgSender();
        _mint(sender, TOKEN_CLAIM_ALLOWANCE);
        emit Claim(sender, TOKEN_CLAIM_ALLOWANCE);
        return true;
    }

    receive() external payable {}
}
