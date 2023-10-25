import { GsnTestEnvironment } from "@opengsn/cli";
import { GSNConfig } from "@opengsn/common";
import { RelayProvider } from "@opengsn/provider";
import { assert } from "chai";
import { Contract, ethers, BigNumber, Event } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as posRLYTestERC20 from "../artifacts/contracts/tokens/posRLYTestERC20.sol/posRLYTestERC20.json";
import * as TokenFaucet from "../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";

describe("Faucet", () => {
  let token: Contract;
  let faucet: Contract;
  let from: string;
  let to: string;
  let web3provider: any;

  before(async () => {
    const {
      contractsDeployment: { paymasterAddress, forwarderAddress },
    } = await GsnTestEnvironment.startGsn("localhost", 8090);

    web3provider = new Web3HttpProvider("http://127.0.0.1:8545/");
    const deploymentProvider = new ethers.providers.Web3Provider(web3provider);
    const erc20Factory = new ethers.ContractFactory(
      posRLYTestERC20.abi,
      posRLYTestERC20.bytecode,
      deploymentProvider.getSigner()
    );

    const factory = new ethers.ContractFactory(
      TokenFaucet.abi,
      TokenFaucet.bytecode,
      deploymentProvider.getSigner()
    );

    token = await erc20Factory.deploy();
    await token.deployed();

    faucet = await factory.deploy(
      token.address,
      ethers.utils.parseEther("10"),
      forwarderAddress
    );
    await faucet.deployed();

    const config = {
      paymasterAddress,
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
  });

  describe("dust wallet", async () => {
    let tokenBalanceChange: BigNumber;
    let events: Event[];
    before(async () => {
      const beforeTokenBalance = await token.balanceOf(from);
      await faucet.claim();

      const afterTokenBalancealance = await token.balanceOf(from);

      events = await faucet.queryFilter("Claim");

      tokenBalanceChange = BigNumber.from(afterTokenBalancealance).sub(
        BigNumber.from(beforeTokenBalance)
      );
    });
    it("should increase token balance by 10", async () => {
      assert.equal(10, Number(ethers.utils.formatEther(tokenBalanceChange)));
      assert.equal(
        10,
        Number(ethers.utils.formatEther(events[0].args?.amount))
      );
    });

    it("should not pay for gas", async () => {
      assert.equal(0, (await faucet.provider.getBalance(from)).toNumber());
    });
  });
});
