import { GsnTestEnvironment } from "@opengsn/cli";
import { GSNConfig } from "@opengsn/common";
import { RelayProvider } from "@opengsn/provider";
import { assert } from "chai";
import { Contract, ethers } from "ethers";
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
    } = await GsnTestEnvironment.startGsn("localhost");

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
        logLevel: "debug",
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
    let tokenBalanceChange: number;
    before(async () => {
      const beforeTokenBalance = await faucet.balanceOf(from);
      await faucet.claim();
      const afterTokenBalancealance = await faucet.balanceOf(from);
      tokenBalanceChange = afterTokenBalancealance - beforeTokenBalance;
    });
    it("should increase token balance by 10", async () => {
      assert.equal(10, tokenBalanceChange);
    });
    it("should not pay for gas", async () => {
      assert.equal(0, (await faucet.provider.getBalance(from)).toNumber());
    });
  });
  describe("transfer token", async () => {
    let fromBalanceChange: number;
    let toBalanceChange: number;
    before(async () => {
      const beforeTokenBalanceFrom = await faucet.balanceOf(from);
      const beforeTokenBalanceTo = await faucet.balanceOf(to);
      await faucet.transfer(to, 5);
      const afterTokenBalanceFrom = await faucet.balanceOf(from);
      const afterTokenBalanceTo = await faucet.balanceOf(to);

      fromBalanceChange = afterTokenBalanceFrom - beforeTokenBalanceFrom;
      toBalanceChange = afterTokenBalanceTo - beforeTokenBalanceTo;
    });
    it("should decrease from token balance by 5", async () => {
      assert.equal(-5, fromBalanceChange);
    });
    it("should increase to token balance by 5", async () => {
      assert.equal(5, toBalanceChange);
    });
    it("should not have paid for gas", async () => {
      assert.equal(0, (await faucet.provider.getBalance(from)).toNumber());
    });
  });
});
