# RLY Gas Station

This repo allows you to use the gas station network locally for both running tests and testing the gas station network on a locally running hardhat ethereum node

## local development

To test against a locally running instance of the gas station network you need to have a hardhat ethereum node running on localhost, you need to deploy the gas station network contracts and you need to deploy the `TokenFaucet.sol` contract. This can be done with the following commands.

1. start local node

`npm run start:local`

2. deploy GSN contracts, start GSN relay server and `TokenFaucet.sol` contract. This will deploy the GSN contracts, start the GSN relay server and deploy the TokenFaucet.sol contract that can be used to test dusting of wallets (see below)

`npm run deploy:local`

With the GSN contracts deployes, relay server running and TokenFaucet.sol contract deployed you should be able to call the `claim()` method on the `TokenFaucet.sol` contract to dust the wallet with 10 units of the test ERC20 contract and the `transferFrom()` method to transfer any amount of tokens from the ERC20 contract without incurring any gas fees to the calling account.

There is an example of a client call to the `TokenFaucet.sol` contract using a GSN provider in `/examples/clientExample.ts`

## running tests

To run tests on the `TokenFaucet.sol` or any other contract that you'd like to test you can run `npm run test:local` this will spin up a local hardhat node and run the tests in `/tests` against that node.

## docker

To run the hardhat ethereum node and relay server in a docker container do the following

1. build docker image form Dockerfile

`$ docker build . -t rly-gas-station`

2. Run docker image. note: port 8545 is where the json rpc server is running and port 8090 is where the relayer is running

`$ docker run -it -d -p 8545:8545 -p 8090:8090 --name testgsn rly-gas-station`

3. Deploy contracts and start relay server.

`docker exec -it testgsn /bin/sh -c "cd /user/src/app; yarn deploy:local";`

output of deployment

````== startGSN: ready.
local deployment successful!
paymaster deployed to 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
forwarder deployed to 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
token faucet deployed to 0x3Aa5ebB10DC797CAC828524e59A333d0A371443c```
````

at this point you should be able to test the client example running `$ npx ts-node examples/clientExample.ts`

## Mumbai Network

All required contracts for testing on the polygon mumbai test network have been deployed. The deployed contract addresses can be found below

Token Faucet: [0x946B1A4eA6457b285254Facb54B896Ab0fAE3a7C](https://mumbai.polygonscan.com/address/0x946B1A4eA6457b285254Facb54B896Ab0fAE3a7C)  
GSN Contracts: [GSN docs](https://docs.opengsn.org/networks/polygon/mumbai.html)
