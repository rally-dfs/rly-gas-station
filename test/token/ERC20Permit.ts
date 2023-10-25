import { GsnTestEnvironment } from "@opengsn/cli";
import { assert } from "chai";
import { Contract } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as erc20Permit from "../../artifacts/contracts/tokens/ERC20Permit.sol/ERC20PermitToken.json";
import * as Paymaster from "../../artifacts/contracts/paymasters/RLYWhitelistPaymaster.sol/RLYWhitelistPaymaster.json";
import { getTypedPermitData } from "./metaTx712";
import { ethers } from "hardhat";
import { gsnLightClient } from "../../examples/gsnClient/gsnClient";
import { GsnTransactionDetails, rlyEnv } from "../../examples/gsnClient/utils";

describe("erc20Permit", () => {
  let token: Contract;
  let pm: Contract;
  let forwarder: string | undefined;
  let relayHub: string | undefined;
  let from: string;
  let to: string;
  let web3provider: any;
  let gsnProvider: any;
  let fromWallet: any;
  let toWallet: any;

  before(async () => {
    const {
      contractsDeployment: { relayHubAddress, forwarderAddress },
    } = await GsnTestEnvironment.startGsn("localhost", 8090);

    web3provider = new Web3HttpProvider("http://127.0.0.1:8545/");
    const deploymentProvider = new ethers.providers.Web3Provider(web3provider);

    const paymasterFactory = new ethers.ContractFactory(
      Paymaster.abi,
      Paymaster.bytecode,
      deploymentProvider.getSigner()
    );

    const erc20Factory = new ethers.ContractFactory(
      erc20Permit.abi,
      erc20Permit.bytecode,
      deploymentProvider.getSigner()
    );

    token = await erc20Factory.deploy("Rally", "RLY");

    await token.deployed();

    const methodIdPermit = token.interface.getSighash("permit");
    forwarder = forwarderAddress;
    relayHub = relayHubAddress;
    pm = await paymasterFactory.deploy();
    await pm.setMethodWhitelist(token.address, methodIdPermit, true, true);
    await pm.setRelayHub(relayHubAddress!);
    await pm.setTrustedForwarder(forwarderAddress!);

    await deploymentProvider.getSigner().sendTransaction({
      to: pm.address,
      value: ethers.utils.parseEther("1.0"),
    });

    const fromAccount = ethers.Wallet.createRandom();
    const toAccount = ethers.Wallet.createRandom();

    from = await fromAccount.address;
    fromWallet = fromAccount;
    to = await toAccount.address;

    gsnProvider = new gsnLightClient(fromAccount, rlyEnv.local);
    await gsnProvider.init();

    //@ts-ignore

    token = token.connect(deploymentProvider.getSigner());
    await token.transfer(from, ethers.utils.parseEther("20"));
  });

  describe("call permit", async () => {
    before(async () => {
      const beforeTokenBalance = await token.balanceOf(from);
      assert.equal(
        beforeTokenBalance.toString(),
        ethers.utils.parseEther("20").toString()
      );
    });
    it("Should send permit call to paymaster with transferfrom call in paymaster data and execute both", async () => {
      if (!forwarder) {
        return "no fordwarder";
      }

      const ethersProvider = new ethers.providers.Web3Provider(web3provider);
      const erc20 = new Contract(
        token.address,
        erc20Permit.abi,
        ethersProvider
      );

      const { chainId } = await ethersProvider.getNetwork();

      const name = await erc20.name();
      const nonce = await erc20.nonces(from);

      const MAX_INT =
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

      const typedData = getTypedPermitData({
        name,
        version: `1`,
        chainId,
        verifyingContract: erc20.address,
        owner: from,
        spender: pm.address,
        value: ethers.utils.parseEther("5").toString(),
        nonce: nonce.toNumber(),
        deadline: MAX_INT,
      });

      const signature = await fromWallet._signTypedData(
        typedData.domain,
        typedData.types,
        typedData.message
      );

      const { r, s, v } = ethers.utils.splitSignature(signature);

      const tx = await erc20.populateTransaction.permit(
        from,
        pm.address,
        ethers.utils.parseEther("5"),
        MAX_INT,
        v,
        r,
        s,
        { from: from }
      );
      const gas = await erc20.estimateGas.permit(
        from,
        pm.address,
        ethers.utils.parseEther("5"),
        MAX_INT,
        v,
        r,
        s,
        { from: from }
      );

      const fromTx = await erc20.populateTransaction.transferFrom(
        from,
        to,
        ethers.utils.parseEther("5")
      );

      const gasPrice = await ethersProvider.getGasPrice();

      const paymasterData =
        "0x" +
        erc20.address.replace(/^0x/, "") +
        fromTx.data?.replace(/^0x/, "");

      const gsnTx = {
        from,
        data: tx.data,
        value: "0",
        to: tx.to,
        gas: gas._hex,
        maxFeePerGas: gasPrice._hex,
        maxPriorityFeePerGas: gasPrice?._hex,
        paymasterData,
      } as GsnTransactionDetails;

      const preBalance = await erc20.balanceOf(to);

      await gsnProvider.relayTransaction(gsnTx, paymasterData);

      const balance = await erc20.balanceOf(to);

      assert.equal(
        preBalance.toString(),
        ethers.utils.parseEther("0").toString()
      );
      assert.equal(balance.toString(), ethers.utils.parseEther("5").toString());
    });

    it("Should not change balances if permit sent without paymaster data", async () => {
      if (!forwarder) {
        return "no fordwarder";
      }

      const ethersProvider = new ethers.providers.Web3Provider(web3provider);
      const erc20 = new Contract(
        token.address,
        erc20Permit.abi,
        ethersProvider
      );

      const { chainId } = await ethersProvider.getNetwork();

      const name = await erc20.name();
      const nonce = await erc20.nonces(from);

      const MAX_INT =
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

      const typedData = getTypedPermitData({
        name,
        version: `1`,
        chainId,
        verifyingContract: erc20.address,
        owner: from,
        spender: pm.address,
        value: ethers.utils.parseEther("5").toString(),
        nonce: nonce.toNumber(),
        deadline: MAX_INT,
      });

      const signature = await fromWallet._signTypedData(
        typedData.domain,
        typedData.types,
        typedData.message
      );

      const { r, s, v } = ethers.utils.splitSignature(signature);

      const tx = await erc20.populateTransaction.permit(
        from,
        pm.address,
        ethers.utils.parseEther("5"),
        MAX_INT,
        v,
        r,
        s,
        { from: from }
      );
      const gas = await erc20.estimateGas.permit(
        from,
        pm.address,
        ethers.utils.parseEther("5"),
        MAX_INT,
        v,
        r,
        s,
        { from: from }
      );

      const gasPrice = await ethersProvider.getGasPrice();

      const paymasterData = "0x";

      const gsnTx = {
        from,
        data: tx.data,
        value: "0",
        to: tx.to,
        gas: gas._hex,
        maxFeePerGas: gasPrice._hex,
        maxPriorityFeePerGas: gasPrice?._hex,
        paymasterData,
      } as GsnTransactionDetails;

      const preBalance = await erc20.balanceOf(to);

      await gsnProvider.relayTransaction(gsnTx, paymasterData);

      const balance = await erc20.balanceOf(to);

      assert.equal(
        preBalance.toString(),
        ethers.utils.parseEther("5").toString()
      );
      assert.equal(balance.toString(), ethers.utils.parseEther("5").toString());
    });
  });
});
