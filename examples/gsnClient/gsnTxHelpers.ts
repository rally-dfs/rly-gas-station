import { ethers, BigNumber } from "ethers";
import { RelayRequest } from "./EIP712/RelayRequest";
import { gsnLightClientConfig } from "./gsnLightClientConfig";
import { TypedGsnRequestData } from "./EIP712/typedSigning";
import {
  PrefixedHexString,
  GsnTransactionDetails,
  Address,
  AccountKeypair,
} from "./utils";

//TODO: move outside of @opengsn

import relayHubAbi from "./ABI/IRelayHub.json";
import forwarderAbi from "./ABI/IForwarder.json";

const calculateCalldataBytesZeroNonzero = (
  calldata: PrefixedHexString
): { calldataZeroBytes: number; calldataNonzeroBytes: number } => {
  const calldataBuf = Buffer.from(calldata.replace("0x", ""), "hex");
  let calldataZeroBytes = 0;
  let calldataNonzeroBytes = 0;
  calldataBuf.forEach((ch) => {
    ch === 0 ? calldataZeroBytes++ : calldataNonzeroBytes++;
  });
  return { calldataZeroBytes, calldataNonzeroBytes };
};

const calculateCalldataCost = (
  msgData: PrefixedHexString,
  gtxDataNonZero: number,
  gtxDataZero: number
): number => {
  const { calldataZeroBytes, calldataNonzeroBytes } =
    calculateCalldataBytesZeroNonzero(msgData);
  return (
    calldataZeroBytes * gtxDataZero + calldataNonzeroBytes * gtxDataNonZero
  );
};

export const estimateGasWithoutCallData = (
  transaction: GsnTransactionDetails,
  gtxDataNonZero: number,
  gtxDataZero: number
) => {
  const originalGas = transaction.gas;
  const callDataCost = calculateCalldataCost(
    transaction.data,
    gtxDataNonZero,
    gtxDataZero
  );
  const adjustedgas = BigNumber.from(originalGas).sub(callDataCost);
  return adjustedgas.toHexString();
};

export const estimateCalldataCostForRequest = async (
  relayRequestOriginal: RelayRequest,
  config: gsnLightClientConfig
): Promise<PrefixedHexString> => {
  // protecting the original object from temporary modifications done here
  const relayRequest = Object.assign({}, relayRequestOriginal, {
    relayData: Object.assign({}, relayRequestOriginal.relayData),
  });

  relayRequest.relayData.transactionCalldataGasUsed = "0xffffffffff";
  relayRequest.relayData.paymasterData =
    "0x" + "ff".repeat(config.maxPaymasterDataLength);
  const maxAcceptanceBudget = "0xffffffffff";
  const signature = "0x" + "ff".repeat(65);
  const approvalData = "0x" + "ff".repeat(config.maxApprovalDataLength);

  const relayHub = new ethers.Contract(config.relayHubAddress, relayHubAbi);

  const { data } = await relayHub.populateTransaction.relayCall(
    config.domainSeparatorName,
    maxAcceptanceBudget,
    relayRequest,
    signature,
    approvalData
  );

  if (!data) {
    throw "tx data undefined";
  }

  return BigNumber.from(
    calculateCalldataCost(data, config.gtxDataNonZero, config.gtxDataZero)
  ).toHexString();
};

export const getSenderNonce = async (
  sender: Address,
  forwarderAddress: Address,
  provider: ethers.providers.JsonRpcProvider
): Promise<string> => {
  const forwarder = new ethers.Contract(
    forwarderAddress,
    forwarderAbi,
    provider
  );

  const nonce = await forwarder.getNonce(sender, { from: sender });
  return nonce.toString();
};

export const signRequest = async (
  relayRequest: RelayRequest,
  domainSeparatorName: string,
  chainId: string,
  account: AccountKeypair
) => {
  const cloneRequest = { ...relayRequest };

  const signedGsnData = new TypedGsnRequestData(
    domainSeparatorName,
    Number(chainId),
    relayRequest.relayData.forwarder,
    cloneRequest
  );

  const wallet = new ethers.Wallet(account.privateKey);

  const types = {
    RelayData: [...signedGsnData.types.RelayData],
    RelayRequest: [...signedGsnData.types.RelayRequest],
  };

  const signature = await wallet._signTypedData(
    signedGsnData.domain,
    types,
    signedGsnData.message
  );

  return signature;
};

export const getRelayRequestID = (
  relayRequest: any,
  signature: PrefixedHexString = "0x"
): PrefixedHexString => {
  const types = ["address", "uint256", "bytes"];
  const parameters = [
    relayRequest.request.from,
    relayRequest.request.nonce,
    signature,
  ];

  const hash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(types, parameters)
  );
  const rawRelayRequestId = hash.replace(/^0x/, "").padStart(64, "0");

  const prefixSize = 8;
  const prefixedRelayRequestId = rawRelayRequestId.replace(
    new RegExp(`^.{${prefixSize}}`),
    "0".repeat(prefixSize)
  );
  return `0x${prefixedRelayRequestId}`;
};
