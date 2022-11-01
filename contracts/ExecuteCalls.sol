// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IWETH.sol";


contract ExecuteCalls {
    using SafeMath for uint256;

    event Log(string message, uint256 val);
    address owner;
    address weth_address;
    IWETH private WETH;
    address private constant ETH_address =
        address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    constructor(address _owner, address _weth_address) public payable {
        owner = _owner;
        WETH = IWETH(_weth_address);
        weth_address = _weth_address;
        if (msg.value > 0) {
            WETH.deposit{value: msg.value}();
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function withdraw(address token) external payable onlyOwner {
        //maybe use openzepp implementation for transfer of eth here
        if (token == ETH_address) {
            uint256 bal = address(this).balance;
            payable(msg.sender).transfer(bal);
        } else if (token != ETH_address) {
            uint256 bal = IERC20(token).balanceOf(address(this));
            IERC20(token).transfer(address(msg.sender), bal);
        }
    }

    receive() external payable {}

    function setAddress(address _a) external onlyOwner {
        owner = _a;
    }

    function executeCalls(address[] memory _a, bytes[] memory _c)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < _a.length; i++) {
            (bool _success0, ) = _a[i].call(_c[i]);
            require(_success0);
        }
    }

    function executeCall(
        address payable _to,
        uint256 _value,
        bytes calldata _data
    ) external payable onlyOwner returns (bytes memory) {
        (bool _success, bytes memory _result) = _to.call{value: _value}(_data);
        require(_success);
        return _result;
    }
}
