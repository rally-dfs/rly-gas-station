import { GsnTestEnvironment } from "@opengsn/cli";
import { GSNConfig } from "@opengsn/common";
import { RelayProvider } from "@opengsn/provider";
import { assert } from "chai";
import { Contract, ethers, BigNumber, Event } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as TokenFaucet from "../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";
import * as Paymaster from "../artifacts/contracts/SingleRecipientPaymaster.sol/SingleRecipientPaymaster.json";

describe("Paymaster", () => {
  let faucet: Contract;
  let pm: Contract;
  let from: string;
  let to: string;
  let web3provider: any;

  before(async () => {
    const {
      contractsDeployment: { forwarderAddress, relayHubAddress },
    } = await GsnTestEnvironment.startGsn("localhost", 8090);

    web3provider = new Web3HttpProvider("http://localhost:8545");
    const deploymentProvider = new ethers.providers.Web3Provider(web3provider);
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

    faucet = await faucetFactory.deploy(
      "Cool Token",
      "CT",
      18,
      forwarderAddress
    );

    await faucet.deployed();

    pm = await paymasterFactory.deploy(faucet.address);

    await pm.setRelayHub(relayHubAddress!);
    await pm.setTrustedForwarder(forwarderAddress!);

    await deploymentProvider.getSigner().sendTransaction({
      to: pm.address,
      value: ethers.utils.parseEther("1.0"),
    });

    const config = {
      paymasterAddress: pm.address,
      auditorsCount: 0,
      loggerConfiguration: {
        logLevel: "error",
      },
    } as GSNConfig;

    let gsnProvider = RelayProvider.newProvider({
      provider: web3provider,
      config,
    });
    await gsnProvider.init();

    const fromAccount = ethers.Wallet.createRandom();
    const toAccount = ethers.Wallet.createRandom();

    from = await fromAccount.address;
    to = await toAccount.address;

    gsnProvider.addAccount(fromAccount.privateKey);

    //@ts-ignore
    const etherProvider = new ethers.providers.Web3Provider(gsnProvider);

    faucet = faucet.connect(etherProvider.getSigner(from));
  });

  describe("test events", async () => {
    let tokenBalanceChange: BigNumber;
    let preEvents: Event[];
    let postEvents: Event[];

    before(async () => {
      const beforeTokenBalance = await faucet.balanceOf(from);
      await faucet.claim();
      preEvents = await pm.queryFilter("RLYPaymasterPreCallValues");
      postEvents = await pm.queryFilter("RLYPaymasterPostCallValues");

      const afterTokenBalancealance = await faucet.balanceOf(from);

      tokenBalanceChange = BigNumber.from(afterTokenBalancealance).sub(
        BigNumber.from(beforeTokenBalance)
      );
    });
    it("txhash of pre and post call should be equal", async () => {
      assert.equal(
        preEvents[0].args?.txHash.toString(),
        postEvents[0].args?.txHash.toString()
      );
    });
    it("from address in pre event to be equal to tx sender", async () => {
      assert.equal(from, preEvents[0].args?.from);
    });
  });
});
