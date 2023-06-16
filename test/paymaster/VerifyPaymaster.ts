import { GsnTestEnvironment } from "@opengsn/cli";
import { GSNConfig } from "@opengsn/common";
import { RelayProvider } from "@opengsn/provider";
import { assert, expect } from "chai";
import { Contract, ethers, BigNumber, Event } from "ethers";
import { PrefixedHexString } from "ethereumjs-util";
import { RelayRequest, ApprovalDataCallback } from "@opengsn/common";
import { TypedGsnRequestData } from "./typedGsnRequest";

const Web3HttpProvider = require("web3-providers-http");
import * as TokenFaucet from "../../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";
import * as Paymaster from "../../artifacts/contracts/paymasters/RLYVerifyPaymaster.sol/RLYVerifyPaymaster.json";
import * as posRLYTestERC20 from "../../artifacts/contracts/tokens/posRLYTestERC20.sol/posRLYTestERC20.json";

describe("Paymaster", () => {
  let faucet: Contract;
  let token: Contract;
  let pm: Contract;
  let from: string;
  let to: string;
  let web3provider: any;
  let authSigner: ethers.Wallet;
  let fromAccount: ethers.Wallet;

  async function signRequest(
    relayRequest: RelayRequest,
    domainSeparatorName: string,
    chainId: string,
    userAccount: ethers.Wallet
  ) {
    const cloneRequest = { ...relayRequest };

    const signedGsnData = new TypedGsnRequestData(
      domainSeparatorName,
      Number(chainId),
      relayRequest.relayData.forwarder,
      cloneRequest
    );

    const types = {
      RelayData: [...signedGsnData.types.RelayData],
      RelayRequest: [...signedGsnData.types.RelayRequest],
    };

    const signature = await userAccount._signTypedData(
      signedGsnData.domain,
      types,
      signedGsnData.message
    );

    return signature;
  }

  let mockApprovalFunc: ApprovalDataCallback;

  async function mockGetApprovalData(
    relayRequest: RelayRequest
  ): Promise<PrefixedHexString> {
    return await mockApprovalFunc(relayRequest, "");
  }

  before(async () => {
    const {
      contractsDeployment: { forwarderAddress, relayHubAddress },
    } = await GsnTestEnvironment.startGsn("localhost", 8090);

    web3provider = new Web3HttpProvider("http://127.0.0.1:8545/");
    const deploymentProvider = new ethers.providers.Web3Provider(web3provider);

    const erc20Factory = new ethers.ContractFactory(
      posRLYTestERC20.abi,
      posRLYTestERC20.bytecode,
      deploymentProvider.getSigner()
    );

    const faucetFactory = new ethers.ContractFactory(
      TokenFaucet.abi,
      TokenFaucet.bytecode,
      deploymentProvider.getSigner()
    );

    const paymasterFactory = new ethers.ContractFactory(
      Paymaster.abi,
      Paymaster.bytecode,
      deploymentProvider.getSigner()
    );

    token = await erc20Factory.deploy();
    await token.deployed();

    faucet = await faucetFactory.deploy(
      token.address,
      ethers.utils.parseEther("10"),
      forwarderAddress
    );
    await faucet.deployed();

    authSigner = ethers.Wallet.createRandom();

    const methodId = faucet.interface.getSighash("claim");
    pm = await paymasterFactory.deploy();
    await pm.setMethodOptions(faucet.address, methodId, true);
    await pm.setSigner(authSigner.address);

    await pm.setRelayHub(relayHubAddress!);
    await pm.setTrustedForwarder(forwarderAddress!);

    await deploymentProvider.getSigner().sendTransaction({
      to: pm.address,
      value: ethers.utils.parseEther("1.0"),
    });

    const gsnConfig = {
      maxApprovalDataLength: 132,
      performDryRunViewRelayCall: false,
      paymasterAddress: pm.address,
    };
    const input = {
      provider: web3provider,
      config: gsnConfig,
      overrideDependencies: {
        asyncApprovalData: mockGetApprovalData,
      },
    };

    let gsnProvider = RelayProvider.newProvider(input);
    await gsnProvider.init();

    fromAccount = ethers.Wallet.createRandom();
    const toAccount = ethers.Wallet.createRandom();

    from = await fromAccount.address;
    to = await toAccount.address;

    gsnProvider.addAccount(fromAccount.privateKey);

    //@ts-ignore
    const etherProvider = new ethers.providers.Web3Provider(gsnProvider);

    faucet = faucet.connect(etherProvider.getSigner(from));
    token = token.connect(deploymentProvider.getSigner());

    await token.initialize(
      "Rally Polygon",
      "pRLY",
      18,
      from,
      ethers.utils.parseEther("1000000")
    );
    await token.transfer(faucet.address, ethers.utils.parseEther("100"));
    token = token.connect(etherProvider.getSigner(from));
  });

  it("should call claim and increase users balance by 10", async () => {
    mockApprovalFunc = async (relayRequest: RelayRequest) => {
      const signature = await signRequest(
        relayRequest,
        "GSN Relayed Transaction",
        "1337",
        fromAccount
      );

      const messageHash = ethers.utils.solidityKeccak256(
        ["bytes"],
        [signature]
      );
      const messageHashBinary = ethers.utils.arrayify(messageHash);
      return await authSigner.signMessage(messageHashBinary);
    };
    await faucet.claim();
    const afterTokenBalancealance = await token.balanceOf(from);
    assert.equal(
      ethers.utils.parseEther("10").toString(),
      afterTokenBalancealance.toString()
    );
  });
});
