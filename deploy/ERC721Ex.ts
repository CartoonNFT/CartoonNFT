module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev } = await getNamedAccounts()

  const cardSpec = await ethers.getContract("CardSpec")
  await deploy("NCTO", {
    from: deployer,
    contract: "ERC721Ex",
    args: [cardSpec.address, deployer],
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.tags = ["CardSpec", "NCTO"]
