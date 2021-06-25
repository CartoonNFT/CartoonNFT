module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev } = await getNamedAccounts()
  await deploy("CartoonToken", {
    from: deployer,
    contract: "CartoonToken",
    args: [deployer],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  })
  const cto = await ethers.getContract("CartoonToken")
}
module.exports.tags = ["CartoonToken"]
