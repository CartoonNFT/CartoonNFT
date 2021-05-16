require("@nomiclabs/hardhat-ethers");

// task action function receives the Hardhat Runtime Environment as second argument
task(
  "faucet",
  "send ethers and token to hardhat network",
  async function (_, { ethers, network }) {
    const { USDT } = await getNamedAccounts();
    const { deployer, dev } = await getNamedAccounts();
    const rewardAddress = process.env.TEST_REWARD_ADDRESS;
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x631fc1ea2270e98fbd9d92658ece0f5a269aa161"],
    });
    const wallet = await ethers.getSigner(
      "0x631fc1ea2270e98fbd9d92658ece0f5a269aa161"
    );
    // Send ethers
    await wallet.sendTransaction({
      to: rewardAddress,
      value: ethers.utils.parseEther("1000.0"),
    });
    const USDTContract = await ethers.getContractAt("IERC20", USDT);
    await USDTContract.connect(wallet).transfer(
      rewardAddress,
      ethers.utils.parseEther("100000000.0")
    );

    const cto = await ethers.getContract("CartoonToken");
    await cto.grantRole(await cto.MINT_ROLE(), deployer);
    await cto.mint(rewardAddress, ethers.utils.parseEther("100000.0"));
  }
);

module.exports = {};
