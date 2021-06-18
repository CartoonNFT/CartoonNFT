require("@nomiclabs/hardhat-ethers");

// task action function receives the Hardhat Runtime Environment as second argument
task("faucet", "send ethers and token to hardhat network")
  .addOptionalParam("account", "The account for receiving from faucet")
  .setAction(async function (params, { ethers, network }) {
    const { USDT } = await getNamedAccounts();
    const { deployer, dev } = await getNamedAccounts();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xf977814e90da44bfa03b6295a0616a897441acec"],
    });
    const wallet = await ethers.getSigner(
      "0xf977814e90da44bfa03b6295a0616a897441acec"
    );
    // Send ethers
    await wallet.sendTransaction({
      to: params.account,
      value: ethers.utils.parseEther("1000.0"),
    });
    const USDTContract = await ethers.getContractAt("IERC20", USDT);
    await USDTContract.connect(wallet).transfer(
      params.account,
      ethers.utils.parseEther("100000.0")
    );

    const cto = await ethers.getContract("CartoonToken");
    await cto.grantRole(await cto.MINT_ROLE(), deployer);
    await cto.mint(params.account, ethers.utils.parseEther("100000.0"));
  });

module.exports = {};
