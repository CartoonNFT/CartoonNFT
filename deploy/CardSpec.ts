module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  await deploy("CardSpec", {
    from: deployer,
    contract: "CardSpec",
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.tags = ["CardSpec"]
