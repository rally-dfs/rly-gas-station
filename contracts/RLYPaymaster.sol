//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
pragma experimental ABIEncoderV2;

import "@opengsn/contracts/src/BasePaymaster.sol";

/**
 * a paymaster for a single recipient contract.
 * - reject requests if destination is not the target contract.
 * - reject any request if the target contract reverts.
 */
contract RLYPaymaster is BasePaymaster {
    //mapping(address => mapping(bytes4 => bool)) public methodWhitelist;

    struct MethodOptions {
        bool ignoreTrustedForwarder;
        bool isAllowed;
    }

    mapping(bytes32 => MethodOptions) public methodWhiteList;

    event WhiteListMethodSet();

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
        return setMethodWhitelist(_target, _method, false, true);
    }

    function setMethodWhitelist(
        address target,
        bytes4 method,
        bool _ignoreTrustedForwarder,
        bool _isAllowed
    ) public onlyOwner {
        bytes32 _hash = keccak256((abi.encode(target, method)));
        methodWhiteList[_hash] = MethodOptions({
            ignoreTrustedForwarder: _ignoreTrustedForwarder,
            isAllowed: _isAllowed
        });
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
        address _to = relayRequest.request.to;
        bytes4 _method = GsnUtils.getMethodSig(relayRequest.request.data);

        MethodOptions memory _methodOptions = methodWhiteList[
            keccak256(abi.encode(_to, _method))
        ];

        //verify that this method is whitelisted

        require(_methodOptions.isAllowed, "target not whitelisted");

        //verify trusted forwarder if required by method
        if (!_methodOptions.ignoreTrustedForwarder) {
            GsnEip712Library.verifyForwarderTrusted(relayRequest);
        }

        //hash request to use as identifier
        bytes memory requestHash = abi.encodePacked(
            keccak256((abi.encode(relayRequest.request)))
        );

        _emitPreCallEvent(
            relayRequest,
            requestHash,
            _method,
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

    function _verifyForwarder(GsnTypes.RelayRequest calldata relayRequest)
        internal
        view
        virtual
        override
    {
        // We override GNS default behavior as not every call we do requires the recipient contract to trust the forwarder
        // Some contracts are entirely permisionless and the contract does not care about who calls it.
        // This check is now optionally performed in `_preRelayedCall(..)`
    }
}
