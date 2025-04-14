# fiosdk_typescript_test
Javascript tests of FIO Protocol using Typescript SDK.

# Prerequesites
## NodeJs
NodeJs is required to run the fio.test test suites. By default NodeJs 8 or earlier is installed in Ubuntu 18, however, at least version 16 (Gallium) should be used.

NodeJs may be installed directly using the OS package manager, i.e. apt, or using a 3rd party package manager, e.g. nvm, brew, etc. At FIO we recommend NVM, or node version manager, which provides localized NodeJs installations, on a per-user, per-shell basis. See https://nodejs.org/en/download/package-manager/ and select Linux or go to https://github.com/nvm-sh/nvm#installing-and-updating for more information.

### To install NVM on Linux (Example)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

### To use NVM
Launch a new terminal or ssh session (to load your env)
Type NVM list to see the list of installed nodejs versions. Note the colors, typically the version in green is the nodejs version currently in use. It is also designated with the keyword 'default'.

Type ```nvm install lts/gallium``` to install/use the latest gallium (v16.x) version. This will also update the current in-use version to v16.x

Type ```nvm use <version>``` or ```nvm use lts/gallium``` to update the version used.

The link above has further instructions on installation, how to designate specific versions, etc. Note that to use a specific version, one must run the command ```nvm use <version>``` in each session or add this command to your ".bashrc" to set the Node version on login.

## 1. Clone the fio.test repo and install the base modules.
```
git clone https://github.com/fioprotocol/fio.test.git
cd fio.test
npm install  
```
## 2. Install the target version of fiosdk_typescript. The following list some examples:

```
\\ Install the most recent version of the published sdk
npm install @fioprotocol/fiosdk 

\\ Install a specific version of the published sdk
npm install @fioprotocol/fiosdk@1.9.0 

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
