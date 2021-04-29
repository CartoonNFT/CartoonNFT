import { network, ethers, getNamedAccounts, waffle } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"
import { check } from "prettier"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("CoinWindPoolWithNFT", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.ERC721Ex = await ethers.getContractFactory("ERC721Ex")
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.CoinWindPoolWithNFT = await ethers.getContractFactory("CoinWindPoolWithNFT")
    this.bob = await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x631fc1ea2270e98fbd9d92658ece0f5a269aa161"],
    })
    this.bob = await ethers.getSigner("0x631fc1ea2270e98fbd9d92658ece0f5a269aa161")
    ;[this.alice, , this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()

    const { MDX, WBNB, USDT, MDXFactory, MDXRouter, CoinWind } = await getNamedAccounts()
    this.USDT = await ethers.getContractAt("IERC20", USDT)
    this.WBNB = await ethers.getContractAt("IERC20", WBNB)
    this.mdexToken = await ethers.getContractAt("IERC20", MDX)
    this.mdxFactory = await ethers.getContractAt("IMdexFactory", MDXFactory)
    this.mdxRouter = await ethers.getContractAt("IMdexRouter", MDXRouter)
    this.coinWind = await ethers.getContractAt("ICoinWind", CoinWind)

    this.startBlockNumber = await ethers.provider.getBlockNumber()
    this.cto = await this.Token.deploy(this.alice.address)
    await this.cto.deployed()
  })
  beforeEach(async function () {
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
    this.nft = await this.ERC721Ex.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()
    this.coinWindPoolWithNFT = await this.CoinWindPoolWithNFT.deploy(
      this.cto.address,
      this.nft.address,
      this.mdexToken.address,
      this.WBNB.address,
      this.coinWind.address,
      ethers.utils.parseUnits("1", 18),
      this.startBlockNumber,
      this.cardSpec.address,
      this.alice.address
    )
    await this.coinWindPoolWithNFT.deployed()

    await this.cto.grantRole(await this.cto.MINT_ROLE(), this.coinWindPoolWithNFT.address)

    await this.cardSpec.addCardType(1000, 2000, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(1001, 2001, ethers.utils.formatBytes32String("what?"))

    await this.nft.grantRole(await this.nft.MINT_ROLE(), this.alice.address)
    await this.nft.mintCard(this.bob.address, 0)
    await this.nft.mintCard(this.bob.address, 1)

    await this.coinWindPoolWithNFT.add(
      10, // allocPoint
      this.WBNB.address,
      0,
      true
    )
    await this.coinWindPoolWithNFT.add(
      10, // allocPoint
      this.USDT.address,
      1,
      true
    )
  })
  it("should be check property", async function () {
    expect(await this.coinWindPoolWithNFT.cto()).equal(this.cto.address)
    expect(await this.coinWindPoolWithNFT.ctoPerBlock()).equal(ethers.utils.parseUnits("1", 18))
    expect(await this.coinWindPoolWithNFT.totalAllocPoint()).equal(20)
    expect(await this.coinWindPoolWithNFT.startBlock()).equal(this.startBlockNumber)
    expect(await this.coinWindPoolWithNFT.poolLength()).equal(2)
  })

  it("should be add pool", async function () {
    expect(await this.coinWindPoolWithNFT.poolLength()).equal(2)
    await this.coinWindPoolWithNFT.add(
      11, // allocPoint
      this.USDT.address,
      2,
      false
    ).should.be.rejected
    await this.coinWindPoolWithNFT.add(
      11, // allocPoint
      this.USDT.address,
      0,
      false
    )
    expect(await this.coinWindPoolWithNFT.poolLength()).equal(3)
    const poolInfo = await this.coinWindPoolWithNFT.poolInfo(2)
    expect(poolInfo["allocPoint"]).equal(11)
    expect(await this.coinWindPoolWithNFT.totalAllocPoint()).equal(31)
  })
  it("should be check pool", async function () {
    const poolInfo = await this.coinWindPoolWithNFT.poolInfo(0)
    expect(poolInfo["lpToken"]).equal(this.WBNB.address)
    expect(poolInfo["accCtoPerShare"]).equal(0)
    expect(poolInfo["allocPoint"]).equal(10)
    expect(poolInfo["tokenIdentity"]).equal(await this.cardSpec.getIdentityFromCardId(0))

    const poolInfo2 = await this.coinWindPoolWithNFT.poolInfo(1)
    expect(poolInfo2["lpToken"]).equal(this.USDT.address)
    expect(poolInfo2["accCtoPerShare"]).equal(0)
    expect(poolInfo2["allocPoint"]).equal(10)
    expect(poolInfo2["tokenIdentity"]).equal(await this.cardSpec.getIdentityFromCardId(1))
  })
  it("should be change allocPoint", async function () {
    await this.coinWindPoolWithNFT.set(0, 11, true)
    let poolInfo = await this.coinWindPoolWithNFT.poolInfo(0)
    expect(poolInfo["allocPoint"]).equal(11)
    expect(await this.coinWindPoolWithNFT.totalAllocPoint()).equal(21)
    await this.coinWindPoolWithNFT.set(0, 12, false)
    poolInfo = await this.coinWindPoolWithNFT.poolInfo(0)
    expect(poolInfo["allocPoint"]).equal(12)
    expect(await this.coinWindPoolWithNFT.totalAllocPoint()).equal(22)
  })
  it("should be depositETH check pair", async function () {
    await this.coinWindPoolWithNFT
      .connect(this.bob)
      .depositETH(1, 0, { value: ethers.utils.parseEther("1.0") })
      .should.be.rejectedWith("wrong lp token")
  })
  it("should be change dev", async function () {
    expect(await this.coinWindPoolWithNFT.devaddr()).equal(this.alice.address)
    this.coinWindPoolWithNFT.connect(this.bob).dev(this.carol.address).should.be.rejectedWith("wut?")
    this.coinWindPoolWithNFT.dev(this.carol.address)
    expect(await this.coinWindPoolWithNFT.devaddr()).equal(this.carol.address)
  })
  context("Liquidity mining", async function () {
    beforeEach(async function () {
      this.tokenId1 = await this.nft.tokenOfOwnerByIndex(this.bob.address, 0)
      this.tokenId2 = await this.nft.tokenOfOwnerByIndex(this.bob.address, 1)
      expect(await this.nft.balanceOf(this.bob.address)).equal(2)
      expect(await this.nft.balanceOf(this.coinWindPoolWithNFT.address)).equal(0)
      expect((await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)).amount).equal(0)
      await this.nft.connect(this.bob).approve(this.coinWindPoolWithNFT.address, this.tokenId1)
      await this.coinWindPoolWithNFT.connect(this.bob).depositETH(0, this.tokenId1, { value: ethers.utils.parseEther("1.0") })
      expect((await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))

      expect((await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)).amount).equal(0)
      await this.nft.connect(this.bob).approve(this.coinWindPoolWithNFT.address, this.tokenId2)
      await this.USDT.connect(this.bob).approve(this.coinWindPoolWithNFT.address, ethers.utils.parseUnits("1", 18))
      await this.coinWindPoolWithNFT.connect(this.bob).deposit(1, ethers.utils.parseUnits("1", 18), this.tokenId2)
      expect((await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))
      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
      expect(await this.nft.balanceOf(this.coinWindPoolWithNFT.address)).equal(2)
    })
    it("deposit", async function () {
      expect((await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))
      expect((await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))
      expect(await this.cto.balanceOf(this.bob.address)).equal(0)
      await this.coinWindPoolWithNFT.connect(this.bob).depositETH(0, 0, { value: ethers.utils.parseEther("1.0") })
      let tempBalance = await this.cto.balanceOf(this.bob.address)
      expect(tempBalance).above(0)
      await this.USDT.connect(this.bob).approve(this.coinWindPoolWithNFT.address, ethers.utils.parseUnits("1", 18))
      await this.coinWindPoolWithNFT.connect(this.bob).deposit(1, ethers.utils.parseUnits("1", 18), this.tokenId2)
      expect(await this.cto.balanceOf(this.bob.address)).above(tempBalance)
      expect((await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)).amount).equal(ethers.utils.parseEther("2.0"))
      expect((await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)).amount).equal(ethers.utils.parseEther("2.0"))
    })
    it("pending cto", async function () {
      expect(await this.coinWindPoolWithNFT.pendingCto(1, this.bob.address)).equal(0)
      await this.coinWindPoolWithNFT.updatePool(1)
      expect(await this.coinWindPoolWithNFT.pendingCto(1, this.bob.address)).above(0)
    })
    it("claim reward (withdraw)", async function () {
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      await this.coinWindPoolWithNFT.connect(this.bob).withdraw(0, 0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
    })
    it("claim reward (deposit)", async function () {
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      await this.coinWindPoolWithNFT.connect(this.bob).deposit(0, 0, 0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
    })
    it("should be massInvest", async function () {
      await this.coinWindPoolWithNFT.massInvest()
      await this.coinWindPoolWithNFT.pause()
      await this.coinWindPoolWithNFT.massInvest().should.be.rejectedWith("Pausable: paused")
    })
    it("withdraw", async function () {
      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
      let [amount] = await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)
      let oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldETHBalance = await this.bob.getBalance()
      await this.coinWindPoolWithNFT.connect(this.bob).withdrawETH(1, amount.add(1)).should.be.rejectedWith("wrong lp token")
      await this.coinWindPoolWithNFT.connect(this.bob).withdrawETH(0, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.coinWindPoolWithNFT.connect(this.bob).withdrawETH(0, amount)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect((await this.bob.getBalance()).sub(oldETHBalance)).above(0)
      ;[amount] = await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)
      oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldUSDTBalance = await this.USDT.balanceOf(this.bob.address)
      await this.coinWindPoolWithNFT.connect(this.bob).withdraw(1, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.coinWindPoolWithNFT.connect(this.bob).withdraw(1, amount)

      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect((await this.USDT.balanceOf(this.bob.address)).sub(oldUSDTBalance)).above(0)
      expect(await this.nft.balanceOf(this.bob.address)).equal(2)
    })
    it("emergencyWithdraw", async function () {
      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
      const [amount] = await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)
      let oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldUSDTBalance = await this.USDT.balanceOf(this.bob.address)
      await this.coinWindPoolWithNFT.connect(this.bob).emergencyWithdraw(1)
      expect(await this.cto.balanceOf(this.bob.address)).equal(oldBalance)
      expect(await this.USDT.balanceOf(this.bob.address)).equal(oldUSDTBalance.add(amount))
      expect(await this.nft.balanceOf(this.bob.address)).equal(1)
    })
    it("emergencyWithdrawETH", async function () {
      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
      const [amount] = await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)
      let oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldETHBalance = await this.bob.getBalance()
      await this.coinWindPoolWithNFT.connect(this.bob).emergencyWithdrawETH(1).should.be.rejectedWith("wrong lp token")
      await this.coinWindPoolWithNFT.connect(this.bob).emergencyWithdrawETH(0)
      expect(await this.cto.balanceOf(this.bob.address)).equal(oldBalance)
      expect(await this.bob.getBalance()).not.above(oldETHBalance.add(amount))
      expect(await this.nft.balanceOf(this.bob.address)).equal(1)
    })

    it("claim", async function () {
      let oldBalance = await this.mdexToken.balanceOf(this.alice.address)
      await this.coinWindPoolWithNFT.connect(this.bob).claim().should.be.rejectedWith("wut?")
      await this.coinWindPoolWithNFT.massInvest()
      await this.coinWindPoolWithNFT.claim()
      expect(await this.mdexToken.balanceOf(this.alice.address)).above(oldBalance)
    })
    it("should be withdraw all from invest", async function () {
      await this.coinWindPoolWithNFT.emergencyWithdrawAllFromInvest().should.be.rejectedWith("Pausable: not paused")
    })
  })
  context("Liquidity mining pause", async function () {
    beforeEach(async function () {
      await this.coinWindPoolWithNFT.pause()
      this.tokenId1 = await this.nft.tokenOfOwnerByIndex(this.bob.address, 0)
      this.tokenId2 = await this.nft.tokenOfOwnerByIndex(this.bob.address, 1)
      expect(await this.nft.balanceOf(this.bob.address)).equal(2)
      expect((await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)).amount).equal(0)
      await this.nft.connect(this.bob).approve(this.coinWindPoolWithNFT.address, this.tokenId1)
      await this.coinWindPoolWithNFT.connect(this.bob).depositETH(0, this.tokenId1, { value: ethers.utils.parseEther("1.0") })
      expect((await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))

      expect((await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)).amount).equal(0)
      await this.nft.connect(this.bob).approve(this.coinWindPoolWithNFT.address, this.tokenId2)
      await this.USDT.connect(this.bob).approve(this.coinWindPoolWithNFT.address, ethers.utils.parseUnits("1", 18))
      await this.coinWindPoolWithNFT.connect(this.bob).deposit(1, ethers.utils.parseUnits("1", 18), this.tokenId2)
      expect((await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))
      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
    })
    it("withdraw", async function () {
      expect(await this.nft.balanceOf(this.bob.address)).equal(0)
      let [amount] = await this.coinWindPoolWithNFT.userInfo(0, this.bob.address)
      let oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldETHBalance = await this.bob.getBalance()
      await this.coinWindPoolWithNFT.connect(this.bob).withdrawETH(1, amount.add(1)).should.be.rejectedWith("wrong lp token")
      await this.coinWindPoolWithNFT.connect(this.bob).withdrawETH(0, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.coinWindPoolWithNFT.connect(this.bob).withdrawETH(0, amount)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect((await this.bob.getBalance()).sub(oldETHBalance)).above(0)
      expect((await this.bob.getBalance()).sub(oldETHBalance)).not.above(ethers.utils.parseUnits("1", 18))
      ;[amount] = await this.coinWindPoolWithNFT.userInfo(1, this.bob.address)
      oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldUSDTBalance = await this.USDT.balanceOf(this.bob.address)
      await this.coinWindPoolWithNFT.connect(this.bob).withdraw(1, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.coinWindPoolWithNFT.connect(this.bob).withdraw(1, amount)

      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect((await this.USDT.balanceOf(this.bob.address)).sub(oldUSDTBalance)).equal(ethers.utils.parseUnits("1", 18))
      expect(await this.nft.balanceOf(this.bob.address)).equal(2)
    })
    it("should be withdraw all from invest", async function () {
      await this.coinWindPoolWithNFT.emergencyWithdrawAllFromInvest()
    })
    it("should be withdraw from invest", async function () {
      await this.coinWindPoolWithNFT.emergencyWithdrawFromInvest(0)
    })
    it("should be unpase", async function () {
      expect(await this.coinWindPoolWithNFT.paused()).to.be.true
      await this.coinWindPoolWithNFT.unpause()
      expect(await this.coinWindPoolWithNFT.paused()).to.be.false
    })
  })
})
