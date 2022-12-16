import { PrefixedHexString, IntString } from "./utils";

export interface gsnLightClientConfig {
  paymasterAddress: PrefixedHexString;
  forwarderAddress: PrefixedHexString;
  relayHubAddress: PrefixedHexString;
  relayWorkerAddress: PrefixedHexString;
  relayUrl: string;
  rpcUrl: string;
  chainId: IntString;
  maxAcceptanceBudget: IntString;
  domainSeparatorName: string;
  gtxDataZero: number;
  gtxDataNonZero: number;
  requestValidSeconds: number;
  maxPaymasterDataLength: number;
  maxApprovalDataLength: number;
  maxRelayNonceGap: number;
}

export const gsnLightClientRLYConfig = {
  local: {
    paymasterAddress: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    forwarderAddress: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    relayHubAddress: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    relayWorkerAddress: "0x84ef35506635109ce61544193e8f87b0a1a1b4fd",
    relayUrl: "http://localhost:8090",
    rpcUrl: "http://localhost:8545",
    chainId: "1337",
    maxAcceptanceBudget: "285252",
    domainSeparatorName: "GSN Relayed Transaction",
    gtxDataNonZero: 16,
    gtxDataZero: 4,
    requestValidSeconds: 172800,
    maxPaymasterDataLength: 0,
    maxApprovalDataLength: 0,
    maxRelayNonceGap: 3,
  } as gsnLightClientConfig,
};
