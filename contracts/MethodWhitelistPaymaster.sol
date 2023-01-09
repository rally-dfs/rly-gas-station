//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
pragma experimental ABIEncoderV2;

import "@opengsn/contracts/src/BasePaymaster.sol";

/**
 * a paymaster for a single recipient contract.
 * - reject requests if destination is not the target contract.
 * - reject any request if the target contract reverts.
 */
contract MethodWhitelistPaymaster is BasePaymaster {
    mapping(address => mapping(bytes4 => bool)) public methodWhitelist;

    event RLYPaymasterPreCallValues(
        bytes txHash,
        address relay,
        address from,
        bytes4 method,
        uint256 baseRelayFee,
        uint256 gasLimit,
        bytes approvalData,
        uint256 maxPossibleGas,
        uint256 clientId
    );

    event RLYPaymasterPostCallValues(
        bytes txHash,
        uint256 clientId,
        uint256 gasUsed
    );

    constructor(address _target, bytes4 _method) {
        return setMethodWhitelist(_target, _method, true);
    }

    function setMethodWhitelist(
        address target,
        bytes4 method,
        bool isAllowed
    ) public onlyOwner {
        methodWhitelist[target][method] = isAllowed;
    }

    function versionPaymaster()
        external
        view
        virtual
        override
        returns (string memory)
    {
        return "3.0.0-beta.2";
    }

    function _preRelayedCall(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    )
        internal
        virtual
        override
        returns (bytes memory context, bool revertOnRecipientRevert)
    {
        (relayRequest, signature, approvalData, maxPossibleGas);
        bytes4 method = GsnUtils.getMethodSig(relayRequest.request.data);
        require(
            methodWhitelist[relayRequest.request.to][method],
            "target not whitelisted"
        );
        //returning "true" means this paymaster accepts all requests that
        // are not rejected by the recipient contract.

        //hash request to use as identifier
        bytes memory requestHash = abi.encodePacked(
            keccak256((abi.encode(relayRequest.request)))
        );

        _emitPreCallEvent(
            relayRequest,
            requestHash,
            method,
            approvalData,
            maxPossibleGas
        );

        return (requestHash, true);
    }

    function _postRelayedCall(
        bytes calldata context,
        bool success,
        uint256 gasUseWithoutPost,
        GsnTypes.RelayData calldata relayData
    ) internal virtual override {
        (context, success, gasUseWithoutPost, relayData);
        emit RLYPaymasterPostCallValues(
            context,
            relayData.clientId,
            gasUseWithoutPost
        );
    }

    function _emitPreCallEvent(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes memory requestHash,
        bytes4 method,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    ) private {
        emit RLYPaymasterPreCallValues(
            requestHash,
            relayRequest.relayData.relayWorker,
            relayRequest.request.from,
            method,
            relayRequest.relayData.maxFeePerGas,
            relayRequest.request.gas,
            approvalData,
            maxPossibleGas,
            relayRequest.relayData.clientId
        );
    }
}
