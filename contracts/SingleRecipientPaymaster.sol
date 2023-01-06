//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
pragma experimental ABIEncoderV2;

import "@opengsn/contracts/src/BasePaymaster.sol";

/**
 * a paymaster for a single recipient contract.
 * - reject requests if destination is not the target contract.
 * - reject any request if the target contract reverts.
 */
contract SingleRecipientPaymaster is BasePaymaster {
    address public target;

    event TargetChanged(address oldTarget, address newTarget);

    event RLYPaymasterPreCallValues(
        bytes txHash,
        address relay,
        address from,
        bytes encodedFunction,
        uint256 baseRelayFee,
        uint256 gasLimit,
        bytes approvalData,
        uint256 maxPossibleGas
    );

    event RLYPaymasterPostCallValues(
        bytes txHash,
        uint256 clientId,
        uint256 gasUsed
    );

    constructor(address _target) {
        target = _target;
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

    function setTarget(address _target) external onlyOwner {
        emit TargetChanged(target, _target);
        target = _target;
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
        require(relayRequest.request.to == target, "wrong target");
        //returning "true" means this paymaster accepts all requests that
        // are not rejected by the recipient contract.

        //hash request to use as identifier
        bytes memory requestHash = abi.encodePacked(
            keccak256((abi.encode(relayRequest.request)))
        );

        emit RLYPaymasterPreCallValues(
            requestHash,
            relayRequest.relayData.relayWorker,
            relayRequest.request.from,
            relayRequest.request.data,
            relayRequest.relayData.maxFeePerGas,
            relayRequest.request.gas,
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
}
