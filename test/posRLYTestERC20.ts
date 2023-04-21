import { GsnTestEnvironment } from "@opengsn/cli";
import { GSNConfig } from "@opengsn/common";
import { RelayProvider } from "@opengsn/provider";
import { assert, expect } from "chai";
import { Contract, ethers } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as posRLYTestERC20 from "../artifacts/contracts/posRLYTestERC20.sol/posRLYTestERC20.json";
import * as Paymaster from "../artifacts/contracts/RLYPaymaster.sol/RLYPaymaster.json";
import { getTypedData } from "./metaTx712";

describe("posRLYTestERC20", () => {
  let token: Contract;
  let pm: Contract;
  let from: string;
  let to: string;
  let web3provider: any;
  let gsnProvider: any;
  let fromWallet: any;

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
      posRLYTestERC20.abi,
      posRLYTestERC20.bytecode,
      deploymentProvider.getSigner()
    );

    token = await erc20Factory.deploy();

    await token.deployed();

    const methodIdTransfer = token.interface.getSighash("transfer");
    const methodIdExecute = token.interface.getSighash(
      "executeMetaTransaction"
    );
    pm = await paymasterFactory.deploy(token.address, methodIdTransfer);

    await pm.setRelayHub(relayHubAddress!);
    await pm.setTrustedForwarder(forwarderAddress!);
    await pm.setMethodWhitelist(token.address, methodIdExecute, true, true);

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

    gsnProvider = RelayProvider.newProvider({
      provider: web3provider,
      config,
    });
    await gsnProvider.init();

    const fromAccount = ethers.Wallet.createRandom();
    const toAccount = ethers.Wallet.createRandom();

    from = await fromAccount.address;
    fromWallet = fromAccount;
    to = await toAccount.address;

    gsnProvider.addAccount(fromAccount.privateKey);

    web3provider = new ethers.providers.Web3Provider(gsnProvider);
    //@ts-ignore

    token = token.connect(deploymentProvider.getSigner());

    await token.initialize(
      "Rally Polygon",
      "pRLY",
      18,
      from,
      ethers.utils.parseEther("1000000")
    );
    await token.transfer(from, ethers.utils.parseEther("5"));
  });

  describe("meta tx", async () => {
    before(async () => {
      const beforeTokenBalance = await token.balanceOf(from);
      assert.equal(
        beforeTokenBalance.toString(),
        ethers.utils.parseEther("5").toString()
      );
    });
    it("should execute native meta tx", async () => {
      const fromSigner = web3provider.getSigner(from);
      token = token.connect(fromSigner);

      // get function signature
      const data = await token.interface.encodeFunctionData("transfer", [
        to,
        ethers.utils.parseEther("2"),
      ]);

      // name and chainId to be used in EIP712

      const name = await token.name();
      const { chainId } = await web3provider.getNetwork();

      // typed data for signing
      const eip712Data = getTypedData({
        name,
        version: "1",
        salt: ethers.utils.hexZeroPad(ethers.utils.hexlify(chainId), 32),
        verifyingContract: token.address,
        nonce: 0,
        from,
        functionSignature: data,
      });

      //signature for metatransaction
      const signature = await fromWallet._signTypedData(
        eip712Data.domain,
        eip712Data.types,
        eip712Data.message
      );

      //get r,s,v from signature

      const { r, s, v } = ethers.utils.splitSignature(signature);

      // execute meta transaction shoudl transfer 100 tokens from owner to otherAccount
      await token.executeMetaTransaction(from, data, r, s, v);

      expect(await token.balanceOf(from)).to.equal(
        ethers.utils.parseEther("3")
      );
      expect(await token.balanceOf(to)).to.equal(ethers.utils.parseEther("2"));
    });
  });
});
