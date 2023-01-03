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
    paymasterAddress: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
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
  mumbai: {
    paymasterAddress: "0x327BBd6BAc3236BCAcDE0D0f4FCD08b3eDfFbc06",
    forwarderAddress: "0x7A95fA73250dc53556d264522150A940d4C50238",
    relayHubAddress: "0x3a1Df71d11774F25B9d8a35DF4aF1918bff41681",
    relayWorkerAddress: "0xde4e7af613700fcf4452d043d57ee31fb2579fdd",
    relayUrl: "https://mumbai.v3.opengsn.org/v3",
    rpcUrl: "https://rpc.ankr.com/polygon_mumbai",
    chainId: "80001",
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
