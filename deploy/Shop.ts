module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev } = await getNamedAccounts()

  const cto = await ethers.getContract("CartoonToken")
  //   const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")

  const ncto = await ethers.getContract("NCTO")

  await deploy("Shop", {
    from: deployer,
    contract: "Shop",
    args: [cto.address, ncto.address, dev],
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.dependencies = ["NCTO", "CartoonToken"]
module.exports.tags = ["Shop"]
