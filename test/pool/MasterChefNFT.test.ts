import { network, ethers, getNamedAccounts, waffle } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"
import { check } from "prettier"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("MasterChef", function () {
  before(async function () {
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.ERC721EX = await ethers.getContractFactory("ERC721Ex")
    this.MasterChef = await ethers.getContractFactory("MasterChefNFT")
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()

    const { WBNB, USDT, MDXFactory, MDXRouter } = await getNamedAccounts()
    this.USDT = USDT
    this.WBNB = WBNB
    this.mdxFactory = await ethers.getContractAt("IMdexFactory", MDXFactory)
    this.mdxRouter = await ethers.getContractAt("IMdexRouter", MDXRouter)

    this.startBlockNumber = await ethers.provider.getBlockNumber()
    // MasterChef
    this.cto = await this.Token.deploy(this.alice.address)
    await this.cto.deployed()

    await this.cto.grantRole(await this.cto.MINT_ROLE(), this.alice.address)
    await this.cto.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))

    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
    await this.cardSpec.addCardType(1, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(2, 2, ethers.utils.formatBytes32String("what?"))

    this.nft = await this.ERC721EX.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()
    await this.nft.grantRole(await this.nft.MINT_ROLE(), this.alice.address)
    for (let i = 0; i < 5; i++) {
      await this.nft.mintCard(this.bob.address, 1)
      await this.nft.mintCard(this.bob.address, 2)
    }
  })
  beforeEach(async function () {
    this.masterChef = await this.MasterChef.deploy(
      this.cto.address,
      this.nft.address,
      ethers.utils.parseUnits("1", 18),
      this.startBlockNumber,
      this.cardSpec.address
    )
    await this.masterChef.deployed()

    await this.cto.grantRole(await this.cto.MINT_ROLE(), this.masterChef.address)
    await this.masterChef.add(
      10, // allocPoint
      1,
      true
    )
    await this.masterChef.add(
      10, // allocPoint
      2,
      true
    )
  })
  it("should be check property", async function () {
    expect(await this.masterChef.cto()).equal(this.cto.address)
    expect(await this.masterChef.ctoPerBlock()).equal(ethers.utils.parseUnits("1", 18))
    expect(await this.masterChef.totalAllocPoint()).equal(20)
    expect(await this.masterChef.startBlock()).equal(this.startBlockNumber)
    expect(await this.masterChef.poolLength()).equal(2)
  })

  it("should be add pool", async function () {
    expect(await this.masterChef.poolLength()).equal(2)
    await this.masterChef.add(
      11, // allocPoint
      1,
      false
    )
    expect(await this.masterChef.poolLength()).equal(3)
    const poolInfo = await this.masterChef.poolInfo(2)
    expect(poolInfo["allocPoint"]).equal(11)
    expect(await this.masterChef.totalAllocPoint()).equal(31)
  })
  it("should be check pool", async function () {
    const poolInfo = await this.masterChef.poolInfo(0)
    expect(poolInfo["tokenIdentity"]).equal(await this.cardSpec.getIdentityFromCardId(1))
    expect(poolInfo["accCtoPerShare"]).equal(0)
    expect(poolInfo["allocPoint"]).equal(10)

    const poolInfo2 = await this.masterChef.poolInfo(1)
    expect(poolInfo2["tokenIdentity"]).equal(await this.cardSpec.getIdentityFromCardId(2))
    expect(poolInfo2["accCtoPerShare"]).equal(0)
    expect(poolInfo2["allocPoint"]).equal(10)
  })
  it("should be change allocPoint", async function () {
    await this.masterChef.set(0, 11, true)
    let poolInfo = await this.masterChef.poolInfo(0)
    expect(poolInfo["allocPoint"]).equal(11)
    expect(await this.masterChef.totalAllocPoint()).equal(21)
    await this.masterChef.set(0, 12, false)
    poolInfo = await this.masterChef.poolInfo(0)
    expect(poolInfo["allocPoint"]).equal(12)
    expect(await this.masterChef.totalAllocPoint()).equal(22)
  })
  context("deposit", async function () {
    beforeEach(async function () {
      let tokenId0 = await this.nft.getIdentityTokenAt(this.bob.address, await this.cardSpec.getIdentityFromCardId(1), 0)
      await this.nft.connect(this.bob).approve(this.masterChef.address, tokenId0)
      await this.masterChef.connect(this.bob).deposit(0, tokenId0)
    })
    it("deposit", async function () {
      expect(await this.nft.balanceOf(this.bob.address)).equal(9)
      let [amount, amountDebt] = await this.masterChef.getUserInfo(0, this.bob.address)
      expect(amount).equal(1)
      expect(
        await this.masterChef.containsUserTokenId(0, this.bob.address, await this.masterChef.getUserTokenIndex(0, this.bob.address, 0))
      ).to.be.true
    })
    it("pending cto", async function () {
      expect(await this.masterChef.pendingCto(0, this.bob.address)).equal(0)
      await this.masterChef.updatePool(0)
      expect(await this.masterChef.pendingCto(0, this.bob.address)).above(0)
      await network.provider.send("evm_mine", [])
      expect(await this.masterChef.pendingCto(0, this.bob.address)).above(0)
    })
    it("claim reward (withdraw)", async function () {
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      await this.masterChef.connect(this.bob).withdraw(0, 0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
    })
    it("claim reward (deposit)", async function () {
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      await this.masterChef.connect(this.bob).deposit(0, 0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
    })
    it("withdraw", async function () {
      const [amount] = await this.masterChef.getUserInfo(0, this.bob.address)
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      expect(await this.nft.balanceOf(this.bob.address)).equal(5)

      const tokenId = await this.masterChef.getUserTokenIndex(0, this.bob.address, 0)
      expect(await this.nft.ownerOf(tokenId)).equal(this.masterChef.address)
      await this.masterChef.connect(this.bob).withdraw(0, 212).should.be.rejectedWith("withdraw: not good")
      await this.masterChef.connect(this.bob).withdraw(0, tokenId)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect(await this.nft.ownerOf(tokenId)).equal(this.bob.address)
    })
    it("emergencyWithdraw", async function () {
      const tokenId = await this.masterChef.getUserTokenIndex(0, this.bob.address, 0)
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      expect(await this.nft.ownerOf(tokenId)).equal(this.masterChef.address)
      await this.masterChef.connect(this.bob).emergencyWithdraw(0, tokenId)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).equal(0)
      expect(await this.nft.ownerOf(tokenId)).equal(this.bob.address)
    })
  })
})
