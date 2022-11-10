# RLY Gas Station

This repo allows you to use the gas station network locally for both running tests and testing the gas station network on a locally running hardhat ethereum node

## local development

To test against a locally running instance of the gas station you need to have a hardhat ethereum node running on localhost, you need to deploy the gas station network contracts and you need to deploy the `TokenFaucet.sol` contract. This can be done with the following commands.

1. start local node

`npx hardhat node`

2. deploy GSN contracts, start GSN relay server and `TokenFaucet.sol` contract. This will deploy the GSN contracts, start the GSN relay server and deploy the TokenFaucet.sol contract that can be used to test dusting of wallets (see below)

`npm run deploy-local`

With the GSN contracts deployes, relay server running and TokenFaucet.sol contract deployed you should be able to call the `claim()` method on the `TokenFaucet.sol` contract to dust the wallet with 10 units of the test ERC20 contract and the `transferFrom()` method to transfer any amount of tokens from the ERC20 contract without incurring any gas fees to the calling account.

There is an example of a client call to the `TokenFaucet.sol` contract using a GSN provider in `/examples/clientExample.ts`

## running tests

To run tests on the `TokenFaucet.sol` or any other contract that you'd like to test you can run `npm run test-hardhat-node` this will spin up a local hardhat node and run the tests in `/tests` against that node.
