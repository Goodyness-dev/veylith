// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
// Test doubles only. No mock is deployed to Diana.
contract MockKeyStatus {
    bool public broken;bool public proven=true;uint256 public salt;
    function configure(bool broken_,bool proven_,uint256 salt_) external{broken=broken_;proven=proven_;salt=salt_;}
    function pqcKeyStatus(address who) external view returns(bool,uint8,bytes memory,bool){
        require(!broken,'unavailable');bytes memory key=new bytes(2592);key[0]=bytes1(uint8(uint160(who)));key[1]=bytes1(uint8(salt));return(true,1,key,proven);
    }
}
contract MockVerify {
    uint256 public mode;
    function configure(uint256 mode_) external{mode=mode_;}
    function pqcVerify(bytes calldata key,bytes calldata signature,bytes calldata message) external view returns(bool){
        require(mode!=1,'unavailable');if(mode==2)assembly{return(0,0)}
        bytes32 claimed;assembly{claimed:=calldataload(signature.offset)}
        return mode!=3 && claimed==keccak256(abi.encodePacked(key,message));
    }
}
