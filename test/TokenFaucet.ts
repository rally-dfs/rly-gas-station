import { GsnTestEnvironment } from "@opengsn/cli";
import { GSNConfig } from "@opengsn/common";
import { RelayProvider } from "@opengsn/provider";
import { assert } from "chai";
import { Contract, ethers, BigNumber } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as TokenFaucet from "../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";

describe("Faucet", () => {
  let faucet: Contract;
  let from: string;
  let to: string;
  let web3provider: any;

  before(async () => {
    const {
      contractsDeployment: { paymasterAddress, forwarderAddress },
    } = await GsnTestEnvironment.startGsn("localhost", 8090);

    web3provider = new Web3HttpProvider("http://localhost:8545");
    const deploymentProvider = new ethers.providers.Web3Provider(web3provider);
    const factory = new ethers.ContractFactory(
      TokenFaucet.abi,
      TokenFaucet.bytecode,
      deploymentProvider.getSigner()
    );

    faucet = await factory.deploy("Cool Token", "CT", 18, forwarderAddress);
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
  });

  describe("dust wallet", async () => {
    let tokenBalanceChange: BigNumber;
    before(async () => {
      const beforeTokenBalance = await faucet.balanceOf(from);
      await faucet.claim();

      const afterTokenBalancealance = await faucet.balanceOf(from);

      tokenBalanceChange = BigNumber.from(afterTokenBalancealance).sub(
        BigNumber.from(beforeTokenBalance)
      );
    });
    it("should increase token balance by 10", async () => {
      assert.equal(10, Number(ethers.utils.formatEther(tokenBalanceChange)));
    });

    it("should not pay for gas", async () => {
      assert.equal(0, (await faucet.provider.getBalance(from)).toNumber());
    });
  });
  describe("transfer token", async () => {
    let fromBalanceChange: BigNumber;
    let toBalanceChange: BigNumber;
    before(async () => {
      const beforeTokenBalanceFrom = await faucet.balanceOf(from);
      const beforeTokenBalanceTo = await faucet.balanceOf(to);
      const gas = await faucet.estimateGas.transfer(
        to,
        ethers.utils.parseEther("5")
      );
      await faucet.transfer(to, ethers.utils.parseEther("5"));
      const afterTokenBalanceFrom = await faucet.balanceOf(from);
      const afterTokenBalanceTo = await faucet.balanceOf(to);

      fromBalanceChange = BigNumber.from(afterTokenBalanceFrom).sub(
        BigNumber.from(beforeTokenBalanceFrom)
      );
      toBalanceChange = BigNumber.from(afterTokenBalanceTo).sub(
        BigNumber.from(beforeTokenBalanceTo)
      );
    });
    it("should decrease from token balance by 5", async () => {
      assert.equal(-5, Number(ethers.utils.formatEther(fromBalanceChange)));
    });
    it("should increase to token balance by 5", async () => {
      assert.equal(5, Number(ethers.utils.formatEther(toBalanceChange)));
    });
    it("should not have paid for gas", async () => {
      assert.equal(0, (await faucet.provider.getBalance(from)).toNumber());
    });
  });
});
