// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IQoreKeyStatus {
    function pqcKeyStatus(address account) external view returns(bool,uint8,bytes memory,bool);
}
interface IQoreVerify {
    function pqcVerify(bytes calldata key,bytes calldata signature,bytes calldata message) external view returns(bool);
}

/// Exact-release authorization; agents must independently enforce its state.
contract ReleaseController {
    struct Approval { address reviewer; bytes signature; }
    struct Release { bytes32 artifactHash; bytes32 manifestHash; uint256 sequence; uint256 deadline; uint256 policyEpoch; bool revoked; }
    bytes32 public immutable project;
    bytes32 public immutable environment;
    bytes32 public immutable nativeChainHash;
    string private nativeChain;
    uint256 public policyEpoch=1;
    uint256 public threshold;
    uint256 public sequence;
    address[] private reviewers;
    mapping(address=>bytes32) public reviewerKeyHash;
    Release private current;
    event ReleaseChanged(bytes32 indexed digest,bytes32 artifactHash,bytes32 manifestHash,uint256 sequence,uint256 deadline,uint256 policyEpoch,bool revoked);
    event PolicyChanged(uint256 epoch,uint256 sequence,uint256 threshold);
    error InvalidPolicy(); error InvalidSequence(); error InvalidEpoch(); error Expired();
    error InvalidRelease(); error InvalidReviewer(); error InvalidKey(); error InvalidSignature();

    constructor(bytes32 project_,bytes32 environment_,string memory nativeChain_,address[] memory reviewers_,uint256 threshold_){
        project=project_;environment=environment_;nativeChain=nativeChain_;nativeChainHash=keccak256(bytes(nativeChain_));
        if(project_==0||environment_==0||bytes(nativeChain_).length==0)revert InvalidPolicy();
        _setPolicy(reviewers_,threshold_);
    }
    function getRelease() external view returns(Release memory){return current;}
    function getReviewers() external view returns(address[] memory){return reviewers;}
    function releaseDigest(Release calldata r) public view returns(bytes32){
        return keccak256(abi.encode(keccak256('VEYLITH_RELEASE_V1'),block.chainid,address(this),nativeChainHash,project,environment,r.artifactHash,r.manifestHash,r.sequence,r.deadline,r.policyEpoch,r.revoked));
    }
    function policyDigest(address[] calldata next,uint256 quorum,uint256 nextSequence,uint256 deadline) public view returns(bytes32){
        return keccak256(abi.encode(keccak256('VEYLITH_POLICY_V1'),block.chainid,address(this),nativeChainHash,project,environment,policyEpoch,keccak256(abi.encode(next)),quorum,nextSequence,deadline));
    }
    function authorize(Release calldata r,Approval[] calldata approvals) external {
        _bounds(r.sequence,r.deadline);
        if(r.policyEpoch!=policyEpoch)revert InvalidEpoch();
        if(r.artifactHash==0||r.manifestHash==0)revert InvalidRelease();
        // Revocation names the current release, rather than substituting another artifact.
        if(r.revoked&&(current.artifactHash!=r.artifactHash||current.manifestHash!=r.manifestHash))revert InvalidRelease();
        bytes32 digest=releaseDigest(r);_verify(digest,approvals);
        sequence=r.sequence;current=r;
        emit ReleaseChanged(digest,r.artifactHash,r.manifestHash,r.sequence,r.deadline,r.policyEpoch,r.revoked);
    }
    function rotatePolicy(address[] calldata next,uint256 quorum,uint256 nextSequence,uint256 deadline,Approval[] calldata approvals) external {
        _bounds(nextSequence,deadline);_verify(policyDigest(next,quorum,nextSequence,deadline),approvals);
        _setPolicy(next,quorum);sequence=nextSequence;policyEpoch++;
        // Old release must not survive an authority change.
        current.revoked=true;
        emit PolicyChanged(policyEpoch,sequence,quorum);
    }
    function _bounds(uint256 nextSequence,uint256 deadline) private view {
        if(nextSequence!=sequence+1)revert InvalidSequence();if(deadline<=block.timestamp)revert Expired();
    }
    function _key(address reviewer) private view returns(bytes memory key){
        (bool ok,bytes memory data)=address(0x0A02).staticcall(abi.encodeCall(IQoreKeyStatus.pqcKeyStatus,(reviewer)));
        if(!ok||data.length<160)revert InvalidKey();
        (bool registered,uint8 algorithm,bytes memory publicKey,bool proven)=abi.decode(data,(bool,uint8,bytes,bool));
        if(!registered||algorithm!=1||!proven||publicKey.length!=2592)revert InvalidKey();return publicKey;
    }
    function _verify(bytes32 digest,Approval[] calldata approvals) private view {
        if(approvals.length<threshold||approvals.length>reviewers.length)revert InvalidSignature();
        address previous;bytes memory message=abi.encodePacked('qorechain-msg-v1|',nativeChain,'|',digest);
        for(uint256 i;i<approvals.length;i++){
            Approval calldata a=approvals[i];
            if(a.reviewer<=previous||reviewerKeyHash[a.reviewer]==0)revert InvalidReviewer();previous=a.reviewer;
            bytes memory key=_key(a.reviewer);if(keccak256(key)!=reviewerKeyHash[a.reviewer])revert InvalidKey();
            if(a.signature.length!=4627)revert InvalidSignature();
            (bool ok,bytes memory result)=address(0x0A01).staticcall(abi.encodeCall(IQoreVerify.pqcVerify,(key,a.signature,message)));
            if(!ok||result.length!=32||!abi.decode(result,(bool)))revert InvalidSignature();
        }
    }
    function _setPolicy(address[] memory next,uint256 quorum) private {
        if(next.length==0||next.length>5||quorum==0||quorum>next.length)revert InvalidPolicy();
        for(uint256 i;i<reviewers.length;i++)delete reviewerKeyHash[reviewers[i]];
        delete reviewers;address previous;
        for(uint256 i;i<next.length;i++){
            if(next[i]<=previous)revert InvalidPolicy();previous=next[i];
            reviewerKeyHash[next[i]]=keccak256(_key(next[i]));reviewers.push(next[i]);
        }
        threshold=quorum;
    }
}
