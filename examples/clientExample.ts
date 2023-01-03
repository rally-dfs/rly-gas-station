import { BigNumber, ethers, Wallet } from "ethers";
import * as TokenFaucet from "../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";
import { gsnLightClient } from "./gsnClient/gsnClient";
import { GsnTransactionDetails, rlyEnv } from "./gsnClient/utils";

// contract addresses for deployed token faucet
const tokenFaucetAddress = "0xD934Ac8fB32336C5a2b51dF6a97432C4De0594F3";

const clientExample = async () => {
  //get users wallet
  const account = ethers.Wallet.createRandom();

  const gsnClient = new gsnLightClient(account, rlyEnv.mumbai);
  await gsnClient.init();

  const web3provider = new ethers.providers.JsonRpcProvider(
    "https://rpc.ankr.com/polygon_mumbai"
  );

  //get instance of faucet contract at deployed address with the gsn provider and account as signer
  const faucet = new ethers.Contract(
    tokenFaucetAddress,
    TokenFaucet.abi,
    web3provider
  );

  //TODO: make this easier for dev
  //call claim method on contract, will be sent via GSN
  const tx = await faucet.populateTransaction.claim?.();
  const gas = await faucet.estimateGas.claim?.();
  const { maxFeePerGas, maxPriorityFeePerGas } =
    await web3provider.getFeeData();

  const gsnTx = {
    from: account.address,
    data: tx.data,
    value: "0",
    to: tx.to,
    gas: gas._hex,
    maxFeePerGas: maxFeePerGas?._hex,
    maxPriorityFeePerGas: maxPriorityFeePerGas?._hex,
  } as GsnTransactionDetails;

  const balPre = await faucet.balanceOf(account.address);
  const balPreEth = await web3provider.getBalance(account.address);

  await gsnClient.relayTransaction(gsnTx);

  const balPost = await faucet.balanceOf(account.address);
  const balPostEth = await web3provider.getBalance(account.address);

  console.log(
    `balance for ${account.address} pre RLY = ${ethers.utils.formatEther(
      balPre
    )}`
  );
  console.log(
    `balance for ${account.address} post RLY = ${ethers.utils.formatEther(
      balPost
    )}`
  );
  console.log(
    `balance for ${account.address} pre ETH = ${ethers.utils.formatEther(
      balPreEth
    )}`
  );
  console.log(
    `balance for ${account.address} post ETH = ${ethers.utils.formatEther(
      balPostEth
    )}`
  );
};

clientExample().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
