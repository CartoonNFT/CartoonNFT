// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;
pragma experimental ABIEncoderV2;
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';

import './ERC721Ex.sol';
import './CardSpec.sol';
import './libraries/EnumerableMap.sol';
import './libraries/TransferHelper.sol';

contract SynthesisMarket is Ownable, Pausable {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableMapper for EnumerableMapper.UintToUintMap;

    struct CardAsset {
        address owner;
        // identity -> tokenId
        EnumerableMapper.UintToUintMap lockTokenIds;
    }

    address public devaddr;
    // card spec
    CardSpec public spec;
    // synthesis payment token
    IERC20 public cto;
    // synthesis payment unit price
    uint256 public unitPrice;
    // synthesis cardId
    uint256 public synthesisCardId;
    // erc721 token
    ERC721Ex public nft;

    // identity -> cardId
    // list for synthesis cardIds
    EnumerableMapper.UintToUintMap private swapCardList;

    uint256 public swapLength;

    // tokenId -> assets
    mapping(uint256 => CardAsset) private assetsIndex;

    constructor(
        address _spec,
        address _token,
        address _nft,
        address _devaddr
    ) {
        spec = CardSpec(_spec);
        cto = IERC20(_token);
        nft = ERC721Ex(_nft);
        devaddr = _devaddr;
    }

    function addSwapCardList(uint256[] memory cardIds) public onlyOwner {
        for (uint256 i; i < cardIds.length; ++i) {
            require(cardIds[i] < spec.getCardTypesLength(), 'card id out of range');
            swapCardList.set(spec.getIdentityFromCardId(cardIds[i]), cardIds[i]);
        }
    }

    function setAllowedLength(uint256 length) public onlyOwner {
        swapLength = length;
    }

    function removeSwapCardList(uint256[] memory cardIds) public onlyOwner {
        for (uint256 i; i < cardIds.length; ++i) {
            require(cardIds[i] < spec.getCardTypesLength(), 'card id out of range');
            swapCardList.remove(spec.getIdentityFromCardId(cardIds[i]));
        }
    }

    function getSwapCardListLength() public view returns (uint256) {
        return swapCardList.length();
    }

    function containSwapCardList(uint256 cardId) public view returns (bool) {
        if (cardId >= spec.getCardTypesLength()) {
            return false;
        }
        return swapCardList.contains(spec.getIdentityFromCardId(cardId));
    }

    function getSwapCardList() public view returns (uint256[] memory cardIds) {
        cardIds = new uint256[](swapCardList.length());
        for (uint256 i; i < swapCardList.length(); ++i) {
            (, cardIds[i]) = swapCardList.at(i);
        }
    }

    function setUnitPrice(uint256 price) public onlyOwner {
        unitPrice = price;
    }

    function setSynthesisCardId(uint256 cardId) external onlyOwner {
        require(cardId < spec.getCardTypesLength(), 'card id out of range');
        synthesisCardId = cardId;
    }

    // synthesis card
    function synthesis(uint256[] calldata tokeIds) external whenNotPaused returns (uint256 tokenId) {
        require(tokeIds.length == swapLength, 'length mismatch');

        // pay some token to dev
        TransferHelper.safeTransferFrom(address(cto), msg.sender, devaddr, unitPrice);

        tokenId = nft.mintCard(msg.sender, synthesisCardId);

        CardAsset storage asset = assetsIndex[tokenId];
        asset.owner = msg.sender;
        require(asset.lockTokenIds.length() == 0, 'length not null');
        for (uint256 i; i < tokeIds.length; ++i) {
            uint256 identity = spec.getTokenIdentity(tokeIds[i]);
            // check token repetition
            require(!asset.lockTokenIds.contains(identity), 'identity has been exist');
            // check token identity not in the list
            require(swapCardList.contains(identity), 'identity not in list');
            asset.lockTokenIds.set(identity, tokeIds[i]);
            nft.transferFrom(msg.sender, address(this), tokeIds[i]);
        }
    }

    // redemption card
    function redemption(uint256 tokenId) external {
        CardAsset storage asset = assetsIndex[tokenId];
        require(asset.owner == msg.sender, 'only asset owner');

        // pay some token to dev
        TransferHelper.safeTransferFrom(address(cto), msg.sender, devaddr, unitPrice);

        nft.burn(tokenId);

        for (uint256 i; i < asset.lockTokenIds.length(); ++i) {
            (uint256 identity, uint256 tokenId) = asset.lockTokenIds.at(i);
            nft.transferFrom(address(this), msg.sender, tokenId);
            asset.lockTokenIds.remove(identity);
        }
        asset.owner = address(0);
    }

    function getAssetsIndex(uint256 tokenId) external view returns (address owner, uint256[] memory lockedTokenIds) {
        CardAsset storage asset = assetsIndex[tokenId];
        owner = asset.owner;
        lockedTokenIds = new uint256[](asset.lockTokenIds.length());
        for (uint256 i; i < asset.lockTokenIds.length(); i++) {
            (, uint256 lockedTokenId) = asset.lockTokenIds.at(i);
            lockedTokenIds[i] = lockedTokenId;
        }
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

    function dev(address _devaddr) public onlyOwner {
        devaddr = _devaddr;
    }
}
