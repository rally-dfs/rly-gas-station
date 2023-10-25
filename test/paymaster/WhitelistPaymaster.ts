import { GsnTestEnvironment } from "@opengsn/cli";
import { GSNConfig } from "@opengsn/common";
import { RelayProvider } from "@opengsn/provider";
import { assert, expect } from "chai";
import { Contract, ethers, BigNumber, Event } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as TokenFaucet from "../../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";
import * as Paymaster from "../../artifacts/contracts/paymasters/RLYWhitelistPaymaster.sol/RLYWhitelistPaymaster.json";
import * as posRLYTestERC20 from "../../artifacts/contracts/tokens/posRLYTestERC20.sol/posRLYTestERC20.json";

describe("Paymaster", () => {
  let faucet: Contract;
  let token: Contract;
  let pm: Contract;
  let from: string;
  let to: string;
  let web3provider: any;

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

    const methodId = faucet.interface.getSighash("claim");
    pm = await paymasterFactory.deploy();
    pm.setMethodWhitelist(faucet.address, methodId, true, true);

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

  describe("test events", async () => {
    let preEvents: Event[];
    let postEvents: Event[];
    let claimEvents: Event[];

    before(async () => {
      await faucet.claim();
      preEvents = await pm.queryFilter("RLYPaymasterPreCallValues");
      postEvents = await pm.queryFilter("RLYPaymasterPostCallValues");
      claimEvents = await faucet.queryFilter("Claim");
    });
    it("txhash of pre and post call should be equal", async () => {
      assert.equal(
        preEvents[0].args?.txHash.toString(),
        postEvents[0].args?.txHash.toString()
      );
    });
    it("sender address in claim event should be equal to from address", async () => {
      assert.equal(from, claimEvents[0].args?.sender);
    });
    it("from address in pre event to be equal to tx sender", async () => {
      assert.equal(from, preEvents[0].args?.from);
    });
  });

  describe("method whitelisting", async () => {
    it("method that hasn't been whitelisted should fail", async () => {
      await expect(
        token.transfer(to, ethers.utils.parseEther("5"))
      ).to.eventually.be.rejectedWith(Error);
    });
  });
});
