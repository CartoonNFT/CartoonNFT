import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("Card Swap Market", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.SwapMarket = await ethers.getContractFactory("SwapMarket")
    this.ERC721Ex = await ethers.getContractFactory("ERC721Ex")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()

    // init card spec
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
    await this.cardSpec.addCardType(1, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(2, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(3, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(4, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(5, 1, ethers.utils.formatBytes32String("what?"))
  })
  beforeEach(async function () {
    // init token
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))
    // init nft

    this.nft = await this.ERC721Ex.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()
    // init card synthesis
    this.swapMarket = await this.SwapMarket.deploy(this.cardSpec.address, this.token.address, this.nft.address, this.dave.address)
    await this.swapMarket.deployed()

    await this.swapMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))
  })
  it("should be set unit price", async function () {
    expect(await this.swapMarket.unitPrice()).equal(ethers.utils.parseUnits("1", 18))
    await this.swapMarket.setUnitPrice(ethers.utils.parseUnits("2", 18))
    expect(await this.swapMarket.unitPrice()).equal(ethers.utils.parseUnits("2", 18))
  })

  it("should be add swap card list", async function () {
    // role check
    let identity = await this.cardSpec.getIdentityFromCardId(1)
    await this.swapMarket.connect(this.bob).addSwapCardList(identity, [2, 3, 4, 5]).should.be.rejectedWith("Ownable: caller is not the owner")
    // card range check
    await this.swapMarket.addSwapCardList(identity, [2, 3, 4, 7]).should.be.rejectedWith("SwapMarket: card id out of range")
    await this.swapMarket.addSwapCardList(identity, [2, 3, 4, 5])

    expect(await this.swapMarket.getSwapCardLength(identity)).equal(4)
    expect(await this.swapMarket.getSwapCardAt(identity, 0)).equal(2)
    expect(await this.swapMarket.getSwapCardAt(identity, 1)).equal(3)
    expect(await this.swapMarket.getSwapCardAt(identity, 2)).equal(4)
    expect(await this.swapMarket.getSwapCardAt(identity, 3)).equal(5)
  })
  it("should be check pause", async function () {
    await this.swapMarket.pause()
    await this.swapMarket.swap(1, 1).should.be.rejectedWith("Pausable: paused")
    await this.swapMarket.unpause()
    await this.swapMarket.swap(1, 1).should.be.rejectedWith("SwapMarket: no swap list")
  })
  it("should be change dev", async function () {
    expect(await this.swapMarket.devaddr()).equal(this.dave.address)
    await this.swapMarket.connect(this.bob).dev(this.isaac.address).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.swapMarket.dev(this.isaac.address)
    expect(await this.swapMarket.devaddr()).equal(this.isaac.address)
  })
  context("Card Swap Market", function () {
    beforeEach(async function () {
      await this.nft.grantRole(await this.nft.MINT_ROLE(), this.swapMarket.address)
      await this.swapMarket.addSwapCardList(await this.cardSpec.getIdentityFromCardId(1), [2, 3, 4, 5])
      await this.swapMarket.addSwapCardList(await this.cardSpec.getIdentityFromCardId(2), [1, 3, 4, 5])
      await this.swapMarket.addSwapCardList(await this.cardSpec.getIdentityFromCardId(3), [1, 2, 4, 5])
      await this.swapMarket.addSwapCardList(await this.cardSpec.getIdentityFromCardId(4), [1, 2, 3, 5])
      await this.swapMarket.addSwapCardList(await this.cardSpec.getIdentityFromCardId(5), [1, 2, 3, 4])

      await this.nft.grantRole(await this.nft.MINT_ROLE(), this.alice.address)
      await this.nft.mintCard(this.bob.address, 1)
      await this.nft.mintCard(this.bob.address, 2)
      await this.nft.mintCard(this.bob.address, 3)
      await this.nft.mintCard(this.bob.address, 4)
      await this.nft.mintCard(this.bob.address, 5)
    })

    it("should be remove swap card", async function () {
      let identity = await this.cardSpec.getIdentityFromCardId(1)
      expect(await this.swapMarket.getSwapCardLength(identity)).equal(4)
      await this.swapMarket.connect(this.bob).removeSwapCardList(identity, [1, 2]).should.be.rejectedWith("Ownable: caller is not the owner")
      await this.swapMarket.removeSwapCardList(identity, [1, 2])

      expect(await this.swapMarket.getSwapCardLength(identity)).equal(3)
      expect(await this.swapMarket.getSwapCardAt(identity, 0)).equal(5)
      expect(await this.swapMarket.getSwapCardAt(identity, 1)).equal(3)
      expect(await this.swapMarket.getSwapCardAt(identity, 2)).equal(4)
    })
    it("should be swap", async function () {
      let identity = await this.cardSpec.getIdentityFromCardId(1)
      await this.swapMarket.connect(this.bob).swap(identity, 1).should.be.rejectedWith("SwapMarket: no swap list")

      let bobNFTBalance = await this.nft.balanceOf(this.bob.address)
      let bobBalance = await this.token.balanceOf(this.bob.address)
      expect(bobNFTBalance).equal(5)
      expect(bobBalance).equal(ethers.utils.parseUnits("1000", 18))
      for (let i = 0; i < 5; i++) {
        const tokenId = await this.nft.tokenOfOwnerByIndex(this.bob.address, i)
        await this.token.connect(this.bob).approve(this.swapMarket.address, await this.swapMarket.unitPrice())
        await this.nft.connect(this.bob).approve(this.swapMarket.address, tokenId)
        await this.swapMarket.connect(this.bob).swap(tokenId, await this.swapMarket.getSwapCardAt(this.cardSpec.getTokenIdentity(tokenId), 0))
        expect(bobNFTBalance).equal(5)
        expect(bobBalance.sub(ethers.utils.parseEther("1"))).equal(await this.token.balanceOf(this.bob.address))
        bobBalance = await this.token.balanceOf(this.bob.address)
      }
    })
  })
})
