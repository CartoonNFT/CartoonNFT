module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev } = await getNamedAccounts()

  const cardSpec = await ethers.getContract("CardSpec")
  const cto = await ethers.getContract("CartoonToken")
  const ncto = await ethers.getContract("NCTO")
  await deploy("SwapMarket", {
    from: deployer,
    contract: "SwapMarket",
    args: [cardSpec.address, cto.address, ncto.address, dev],
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.dependencies = ["CardSpec", "NCTO", "CartoonToken"]
module.exports.tags = ["SwapMarket"]
