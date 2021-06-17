// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;
pragma experimental ABIEncoderV2;
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';

import './ERC721Ex.sol';
import './CardSpec.sol';
import './libraries/TransferHelper.sol';

contract SwapMarket is Ownable, Pausable {
    using EnumerableSet for EnumerableSet.UintSet;
    uint256 private seedIndex;

    // card spec
    CardSpec public spec;
    // synthesis payment token
    IERC20 public cto;
    // erc721 token
    ERC721Ex public nft;

    address public devaddr;

    // synthesis payment unit price
    uint256 public unitPrice;

    // identity -> cardId
    mapping(uint256 => EnumerableSet.UintSet) private identityToswapLists;

    constructor(
        CardSpec _spec,
        IERC20 _cto,
        ERC721Ex _nft,
        address _devaddr
    ) {
        spec = _spec;
        cto = _cto;
        nft = _nft;
        devaddr = _devaddr;
    }

    function addSwapCardList(uint256 _identity, uint256[] memory _cardIds) public onlyOwner {
        for (uint256 i; i < _cardIds.length; ++i) {
            require(_cardIds[i] < spec.getCardTypesLength(), 'SwapMarket: card id out of range');
            identityToswapLists[_identity].add(_cardIds[i]);
        }
    }

    function removeSwapCardList(uint256 _identity, uint256[] memory _cardIds) public onlyOwner {
        for (uint256 i; i < _cardIds.length; ++i) {
            identityToswapLists[_identity].remove(_cardIds[i]);
        }
    }

    function getSwapCardLength(uint256 _identity) public view returns (uint256) {
        return identityToswapLists[_identity].length();
    }

    function getSwapCardAt(uint256 _identity, uint256 _index) public view returns (uint256) {
        return identityToswapLists[_identity].at(_index);
    }

    function setUnitPrice(uint256 price) public onlyOwner {
        unitPrice = price;
    }

    // synthesis card
    function swap(uint256 tokenIdsrc, uint256 cardIdDst) external whenNotPaused returns (uint256 tokenId) {
        uint256 identity = spec.getTokenIdentity(tokenIdsrc);
        require(identityToswapLists[identity].contains(cardIdDst), 'SwapMarket: no swap list');

        // pay some token to dev
        TransferHelper.safeTransferFrom(address(cto), msg.sender, devaddr, unitPrice);

        nft.burn(tokenIdsrc);

        tokenId = nft.mintCard(msg.sender, cardIdDst);
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
