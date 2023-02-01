import React from "react";
import createMetaMaskProvider from "metamask-extension-provider";
import { EthereumEvents } from "../utils/events";
import storage from "../utils/storage";
import { ethers } from "ethers";

export const WalletContext = React.createContext();
export const useWallet = () => React.useContext(WalletContext);

const WalletProvider = React.memo(({ children }) => {
  const [chainId, setChainId] = React.useState(null);
  const [account, setAccount] = React.useState(null);
  const [isAuthenticated, setAuthenticated] = React.useState(false);
  const [appLoading, setAppLoading] = React.useState(false);
  const [userSigner, setUserSigner] = React.useState(null);

  // console.log({ chainId, account, isAuthenticated });

  React.useEffect(() => {
    connectEagerly();
    return () => {
      const provider = getProvider();
      unsubscribeToEvents(provider);
    };
  }, []);

  const subscribeToEvents = (provider) => {
    if (provider && provider.on) {
      provider.on(EthereumEvents.CHAIN_CHANGED, handleChainChanged);
      provider.on(EthereumEvents.ACCOUNTS_CHANGED, handleAccountsChanged);
      provider.on(EthereumEvents.CONNECT, handleConnect);
      provider.on(EthereumEvents.DISCONNECT, handleDisconnect);
    }
  };

  const unsubscribeToEvents = (provider) => {
    if (provider && provider.removeListener) {
      provider.removeListener(EthereumEvents.CHAIN_CHANGED, handleChainChanged);
      provider.removeListener(
        EthereumEvents.ACCOUNTS_CHANGED,
        handleAccountsChanged
      );
      provider.removeListener(EthereumEvents.CONNECT, handleConnect);
      provider.removeListener(EthereumEvents.DISCONNECT, handleDisconnect);
    }
  };

  const connectEagerly = async () => {
    const metamask = await storage.get("metamask-connected");
    if (metamask?.connected) {
      await connectWallet();
    }
  };

  const getProvider = () => {
    if (window.ethereum) {
      console.log("found window.ethereum>>");
      return window.ethereum;
    } else {
      const provider = createMetaMaskProvider();
      return provider;
    }
  };

  const connectWallet = async () => {
    console.log("connecting to Wallet");
    try {
      const provider = new ethers.providers.Web3Provider(
        createMetaMaskProvider()
      );
      // Prompt user for account connections
      await provider.send("eth_requestAccounts", []);

      const signer = provider.getSigner();
      const acc = await signer.getAddress();
      setAccount(acc);
      setAuthenticated(true);
      setUserSigner(signer);
      subscribeToEvents(provider);
    } catch (e) {
      console.log("error while connect", e);
    } finally {
      setAppLoading(false);
    }
  };

  const disconnectWallet = async () => {
    console.log("disconnectWallet runs");
    try {
      storage.set("metamask-connected", { connected: false });
      setAccount(null);
      setAuthenticated(false);
    } catch (e) {
      console.log(e);
    }
  };

  const handleAccountsChanged = (accounts) => {
    setAccount(accounts[0]);
    console.log("[account changes]: ", accounts[0]);
  };

  const handleChainChanged = (chainId) => {
    setChainId(chainId);
    console.log("[chainId changes]: ", chainId);
  };

  const handleConnect = () => {
    setAuthenticated(true);
    console.log("[connected]");
  };

  const handleDisconnect = () => {
    console.log("[disconnected]");
    disconnectWallet();
  };

  return (
    <WalletContext.Provider
      value={{
        disconnectWallet,
        connectWallet,
        isAuthenticated,
        appLoading,
        account,
        userSigner,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
});

export default WalletProvider;
