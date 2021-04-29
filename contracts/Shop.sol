// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';

import './CardSpec.sol';
import './ERC721Ex.sol';
import './libraries/TransferHelper.sol';
import './libraries/EnumerableMap.sol';

contract Shop is Ownable, Pausable {
    using SafeMath for uint256;
    using EnumerableMapper for EnumerableMapper.UintToUintMap;

    // seed for random
    uint256 private seedIndex;

    CardSpec public spec;
    IERC20 public cto;
    ERC721Ex public nft;
    address public devaddr;
    uint256 public unitPrice;

    // blindBox
    uint256 public blindBoxSupply;
    EnumerableMapper.UintToUintMap private blindBoxCardNum;

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

    // set lottery token price
    function setUnitPrice(uint256 _unitPrice) external onlyOwner {
        unitPrice = _unitPrice;
    }

    function changeBlindBoxCard(uint256 _cardId, uint256 _count) external onlyOwner {
        require(_cardId < spec.getCardTypesLength(), 'Shop: CardId out of range');
        if (!blindBoxCardNum.contains(_cardId)) {
            blindBoxSupply = blindBoxSupply.add(_count);
        } else {
            blindBoxSupply = blindBoxSupply.sub(blindBoxCardNum.get(_cardId)).add(_count);
        }
        if (_count == 0) {
            blindBoxCardNum.remove(_cardId);
        } else {
            blindBoxCardNum.set(_cardId, _count);
        }
    }

    // lottery
    function lottery(address _to) external whenNotPaused {
        // must be human
        require(msg.sender == tx.origin, 'Shop: Human only');
        require(blindBoxSupply > 0, 'Shop: Goods sold out');

        // pay token
        TransferHelper.safeTransferFrom(address(cto), msg.sender, devaddr, unitPrice);

        uint256 tempBlindBoxSupply = blindBoxSupply;
        for (uint256 i; i < blindBoxCardNum.length(); ++i) {
            (uint256 cardId, uint256 cardLeft) = blindBoxCardNum.at(i);
            uint256 target = randomGen(++seedIndex, tempBlindBoxSupply);
            if (target < cardLeft) {
                blindBoxCardNum.set(cardId, cardLeft.sub(1));
                blindBoxSupply = blindBoxSupply.sub(1);
                nft.mintCard(_to, cardId);
                break;
            }
            tempBlindBoxSupply = tempBlindBoxSupply.sub(cardLeft);
        }
    }

    function randomGen(uint256 seed, uint256 max) internal view returns (uint256 randomNumber) {
        return (uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp, msg.sender, block.difficulty, seed))) % max);
    }

    function getBlindBoxCardNumLength() external view returns (uint256) {
        return blindBoxCardNum.length();
    }

    function getBlindBoxCardNum(uint256 _cardId) external view returns (uint256) {
        return blindBoxCardNum.get(_cardId);
    }

    function getBlindBoxCardAt(uint256 _index) external view returns (uint256, uint256) {
        return blindBoxCardNum.at(_index);
    }

    function dev(address _devaddr) external onlyOwner {
        devaddr = _devaddr;
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }
}
