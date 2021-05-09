import "dotenv/config"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-waffle"
import '@nomiclabs/hardhat-solhint'
import "@nomiclabs/hardhat-ethers";
import "hardhat-abi-exporter"
import "hardhat-gas-reporter";
import "hardhat-spdx-license-identifier"
import "hardhat-deploy"
import "hardhat-deploy-ethers"
import "hardhat-contract-sizer"
import "solidity-coverage"
import { HardhatUserConfig } from "hardhat/types"
import './tasks/account.js'

const accounts = {
  mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
}
const config: HardhatUserConfig = {
  abiExporter: {
    path: "./abi",
    clear: false,
    flat: true,
  },
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    dev: {
      default: 1
    },
    airDrop: {
      default: 2,
    },
    consultant: {
      default: 3,
    },
    cooperations: {
      default: 4,
    },
    operations: {
      default: 5,
    },
    IDO: {
      default: 6,
    },
    teamRewardAddress: {
      default: process.env.TEAM_REWARD_ADDRESS
    },
    foundationRewardAddress: {
      default: process.env.FOUNDATION_REWARD_ADDRESS
    },
    CoinWind: {
      default: '0x6bA7d75eC6576F88a10bE832C56F0F27DC040dDD'
    },
    WBNB: {
      default: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
    },
    USDT: {
      default: '0x55d398326f99059fF775485246999027B3197955'
    },
    MDX: {
      default: '0x9C65AB58d8d978DB963e63f2bfB7121627e3a739'
    },
    MDXFactory: {
      default: '0x3cd1c46068daea5ebb0d3f55f6915b10648062b8'
    },
    MDXRouter: {
      default: '0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8'
    }
  },
  networks: {
    bsc: {
      url: `https://bsc-dataseed.binance.org`,
      accounts,
      gasPrice: 5 * 1000000000,
      chainId: 56,
    },
    // "bsc-testnet": {
    //   url: `https://data-seed-prebsc-2-s3.binance.org:8545/`,
    //   accounts,
    //   chainId: 97,
    //   gasMultiplier: 2,
    // },
    // localhost: {
    //   saveDeployments: true,
    //   tags: ["local"],
    // },
    hardhat: {
      forking: {
        enabled: process.env.FORKING === "true",
        url: `https://bsc-dataseed.binance.org`,
      },
      live: true,
      // accounts,
      saveDeployments: true,
      tags: ["CartoonToken"]
    },
  },
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "deploy",
    deployments: "deployments",
    imports: "imports",
    sources: "contracts",
    tests: "test",
  },
  solidity: {
    compilers: [
      {
        version: "0.7.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
  mocha: {
    timeout: 1000000
  }
};
export default config;
