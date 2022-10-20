# fiosdk_typescript_test
Javascript tests of FIO Protocol using Typescript SDK.

## 1. Clone the fio.test repo and install the base modules.
```
git clone http://github.com/dapixio/fio.test --recursive
cd fio.test
npm install  
```
## 2. Install the target version of fiosdk_typescript. The following list some examples:

```
\\ Install the most recent version of the published sdk
npm install @fioprotocol/fiosdk 

\\ Install a specific version of the published sdk
npm install @fioprotocol/fiosdk@1.0.0 

\\ Install the develop branch of fiosdk_typescript
npm install fioprotocol/fiosdk_typescript#develop 
```
## 3. Update config.js parameters for your environment

## 4. Run the test

```
npm test
```
# Hardhat Setup
#### 1. Initialize Hardhat environment.
```
npm run hardhat-init
```
#### 2. Run the desired ERC contract tests:
```
# erc20
npm run hardhat-erc20-test
# erc721
npm run hardhat-erc721-test
# erc20 and erc721
npm run hardhat-contracts-test
```
