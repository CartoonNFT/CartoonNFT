import { network, ethers, getNamedAccounts, waffle } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"
import { check } from "prettier"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("CoinWindPool", function () {
  before(async function () {
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.CoinWindPool = await ethers.getContractFactory("CoinWindPool")
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
    this.coinWindPool = await this.CoinWindPool.deploy(
      this.cto.address,
      this.mdexToken.address,
      this.WBNB.address,
      this.coinWind.address,
      ethers.utils.parseUnits("1", 18),
      this.startBlockNumber,
      this.alice.address
    )
    await this.coinWindPool.deployed()

    await this.cto.grantRole(await this.cto.MINT_ROLE(), this.coinWindPool.address)
    await this.coinWindPool.add(
      10, // allocPoint
      this.WBNB.address,
      true
    )
    await this.coinWindPool.add(
      10, // allocPoint
      this.USDT.address,
      true
    )
  })
  it("should be check property", async function () {
    expect(await this.coinWindPool.cto()).equal(this.cto.address)
    expect(await this.coinWindPool.ctoPerBlock()).equal(ethers.utils.parseUnits("1", 18))
    expect(await this.coinWindPool.totalAllocPoint()).equal(20)
    expect(await this.coinWindPool.startBlock()).equal(this.startBlockNumber)
    expect(await this.coinWindPool.poolLength()).equal(2)
  })

  it("should be add pool", async function () {
    expect(await this.coinWindPool.poolLength()).equal(2)
    await this.coinWindPool.add(
      11, // allocPoint
      this.USDT.address,
      false
    )
    expect(await this.coinWindPool.poolLength()).equal(3)
    const poolInfo = await this.coinWindPool.poolInfo(2)
    expect(poolInfo["allocPoint"]).equal(11)
    expect(await this.coinWindPool.totalAllocPoint()).equal(31)
  })
  it("should be check pool", async function () {
    const poolInfo = await this.coinWindPool.poolInfo(0)
    expect(poolInfo["lpToken"]).equal(this.WBNB.address)
    expect(poolInfo["accCtoPerShare"]).equal(0)
    expect(poolInfo["allocPoint"]).equal(10)

    const poolInfo2 = await this.coinWindPool.poolInfo(1)
    expect(poolInfo2["lpToken"]).equal(this.USDT.address)
    expect(poolInfo2["accCtoPerShare"]).equal(0)
    expect(poolInfo2["allocPoint"]).equal(10)
  })
  it("should be change allocPoint", async function () {
    await this.coinWindPool.set(0, 11, true)
    let poolInfo = await this.coinWindPool.poolInfo(0)
    expect(poolInfo["allocPoint"]).equal(11)
    expect(await this.coinWindPool.totalAllocPoint()).equal(21)
    await this.coinWindPool.set(0, 12, false)
    poolInfo = await this.coinWindPool.poolInfo(0)
    expect(poolInfo["allocPoint"]).equal(12)
    expect(await this.coinWindPool.totalAllocPoint()).equal(22)
  })
  it("should be depositETH check pair", async function () {
    await this.coinWindPool
      .connect(this.bob)
      .depositETH(1, { value: ethers.utils.parseEther("1.0") })
      .should.be.rejectedWith("wrong lp token")
  })
  it("should be change dev", async function () {
    expect(await this.coinWindPool.devaddr()).equal(this.alice.address)
    this.coinWindPool.connect(this.bob).dev(this.carol.address).should.be.rejectedWith("wut?")
    this.coinWindPool.dev(this.carol.address)
    expect(await this.coinWindPool.devaddr()).equal(this.carol.address)
  })
  context("Liquidity mining", async function () {
    beforeEach(async function () {
      // await this.coinWindPool.pause()
      expect((await this.coinWindPool.userInfo(0, this.bob.address)).amount).equal(0)
      await this.coinWindPool.connect(this.bob).depositETH(0, { value: ethers.utils.parseEther("1.0") })
      expect((await this.coinWindPool.userInfo(0, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))

      expect((await this.coinWindPool.userInfo(1, this.bob.address)).amount).equal(0)
      await this.USDT.connect(this.bob).approve(this.coinWindPool.address, ethers.utils.parseUnits("1", 18))
      await this.coinWindPool.connect(this.bob).deposit(1, ethers.utils.parseUnits("1", 18))
      expect((await this.coinWindPool.userInfo(1, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))
    })
    it("deposit", async function () {
      expect((await this.coinWindPool.userInfo(0, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))
      expect((await this.coinWindPool.userInfo(1, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))
      expect(await this.cto.balanceOf(this.bob.address)).equal(0)
      await this.coinWindPool.connect(this.bob).depositETH(0, { value: ethers.utils.parseEther("1.0") })
      let tempBalance = await this.cto.balanceOf(this.bob.address)
      expect(tempBalance).above(0)
      await this.USDT.connect(this.bob).approve(this.coinWindPool.address, ethers.utils.parseUnits("1", 18))
      await this.coinWindPool.connect(this.bob).deposit(1, ethers.utils.parseUnits("1", 18))
      expect(await this.cto.balanceOf(this.bob.address)).above(tempBalance)
      expect((await this.coinWindPool.userInfo(0, this.bob.address)).amount).equal(ethers.utils.parseEther("2.0"))
      expect((await this.coinWindPool.userInfo(1, this.bob.address)).amount).equal(ethers.utils.parseEther("2.0"))
    })
    it("pending cto", async function () {
      expect(await this.coinWindPool.pendingCto(1, this.bob.address)).equal(0)
      await this.coinWindPool.updatePool(1)
      expect(await this.coinWindPool.pendingCto(1, this.bob.address)).above(0)
    })
    it("claim reward (withdraw)", async function () {
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      await this.coinWindPool.connect(this.bob).withdraw(0, 0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
    })
    it("claim reward (deposit)", async function () {
      const oldBalance = await this.cto.balanceOf(this.bob.address)
      await this.coinWindPool.connect(this.bob).deposit(0, 0)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
    })
    it("should be massInvest", async function () {
      await this.coinWindPool.massInvest()
      await this.coinWindPool.pause()
      await this.coinWindPool.massInvest().should.be.rejectedWith("Pausable: paused")
    })
    it("withdraw", async function () {
      let [amount] = await this.coinWindPool.userInfo(0, this.bob.address)
      let oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldETHBalance = await this.bob.getBalance()
      await this.coinWindPool.connect(this.bob).withdrawETH(1, amount.add(1)).should.be.rejectedWith("wrong lp token")
      await this.coinWindPool.connect(this.bob).withdrawETH(0, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.coinWindPool.connect(this.bob).withdrawETH(0, amount)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect((await this.bob.getBalance()).sub(oldETHBalance)).above(0)
      ;[amount] = await this.coinWindPool.userInfo(1, this.bob.address)
      oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldUSDTBalance = await this.USDT.balanceOf(this.bob.address)
      await this.coinWindPool.connect(this.bob).withdraw(1, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.coinWindPool.connect(this.bob).withdraw(1, amount)

      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect((await this.USDT.balanceOf(this.bob.address)).sub(oldUSDTBalance)).above(0)
    })
    it("emergencyWithdraw", async function () {
      const [amount] = await this.coinWindPool.userInfo(1, this.bob.address)
      let oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldUSDTBalance = await this.USDT.balanceOf(this.bob.address)
      await this.coinWindPool.connect(this.bob).emergencyWithdraw(1)
      expect(await this.cto.balanceOf(this.bob.address)).equal(oldBalance)
      expect(await this.USDT.balanceOf(this.bob.address)).equal(oldUSDTBalance.add(amount))
    })
    it("emergencyWithdrawETH", async function () {
      const [amount] = await this.coinWindPool.userInfo(0, this.bob.address)
      let oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldETHBalance = await this.bob.getBalance()
      await this.coinWindPool.connect(this.bob).emergencyWithdrawETH(1).should.be.rejectedWith("wrong lp token")
      await this.coinWindPool.connect(this.bob).emergencyWithdrawETH(0)
      expect(await this.cto.balanceOf(this.bob.address)).equal(oldBalance)
      expect(await this.bob.getBalance()).not.above(oldETHBalance.add(amount))
    })

    it("claim", async function () {
      let oldBalance = await this.mdexToken.balanceOf(this.alice.address)
      await this.coinWindPool.connect(this.bob).claim().should.be.rejectedWith("wut?")
      await this.coinWindPool.massInvest()
      await this.coinWindPool.claim()
      expect(await this.mdexToken.balanceOf(this.alice.address)).above(oldBalance)
    })
    it("should be withdraw all from invest", async function () {
      await this.coinWindPool.emergencyWithdrawAllFromInvest().should.be.rejectedWith("Pausable: not paused")
    })
  })
  context("Liquidity mining pause", async function () {
    beforeEach(async function () {
      await this.coinWindPool.pause()
      expect((await this.coinWindPool.userInfo(0, this.bob.address)).amount).equal(0)
      await this.coinWindPool.connect(this.bob).depositETH(0, { value: ethers.utils.parseEther("1.0") })
      expect((await this.coinWindPool.userInfo(0, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))

      expect((await this.coinWindPool.userInfo(1, this.bob.address)).amount).equal(0)
      await this.USDT.connect(this.bob).approve(this.coinWindPool.address, ethers.utils.parseUnits("1", 18))
      await this.coinWindPool.connect(this.bob).deposit(1, ethers.utils.parseUnits("1", 18))
      expect((await this.coinWindPool.userInfo(1, this.bob.address)).amount).equal(ethers.utils.parseEther("1.0"))
    })
    it("withdraw", async function () {
      let [amount] = await this.coinWindPool.userInfo(0, this.bob.address)
      let oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldETHBalance = await this.bob.getBalance()
      await this.coinWindPool.connect(this.bob).withdrawETH(1, amount.add(1)).should.be.rejectedWith("wrong lp token")
      await this.coinWindPool.connect(this.bob).withdrawETH(0, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.coinWindPool.connect(this.bob).withdrawETH(0, amount)
      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect((await this.bob.getBalance()).sub(oldETHBalance)).above(0)
      expect((await this.bob.getBalance()).sub(oldETHBalance)).not.above(ethers.utils.parseUnits("1", 18))
      ;[amount] = await this.coinWindPool.userInfo(1, this.bob.address)
      oldBalance = await this.cto.balanceOf(this.bob.address)
      let oldUSDTBalance = await this.USDT.balanceOf(this.bob.address)
      await this.coinWindPool.connect(this.bob).withdraw(1, amount.add(1)).should.be.rejectedWith("withdraw: not good")
      await this.coinWindPool.connect(this.bob).withdraw(1, amount)

      expect((await this.cto.balanceOf(this.bob.address)).sub(oldBalance)).above(0)
      expect((await this.USDT.balanceOf(this.bob.address)).sub(oldUSDTBalance)).equal(ethers.utils.parseUnits("1", 18))
    })
    it("should be withdraw all from invest", async function () {
      await this.coinWindPool.emergencyWithdrawAllFromInvest()
    })
    it("should be withdraw from invest", async function () {
      await this.coinWindPool.emergencyWithdrawFromInvest(0)
    })
    it("should be unpase", async function () {
      expect(await this.coinWindPool.paused()).to.be.true
      await this.coinWindPool.unpause()
      expect(await this.coinWindPool.paused()).to.be.false
    })
  })
})
