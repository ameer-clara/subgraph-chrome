import logo from './logo.svg';
import './App.css';
import { useWallet } from './context/WalletProvider';
import Transactor from './utils/Transactor';
import { useGasPrice, useContractLoader } from 'eth-hooks';
import { NETWORKS } from './constants';
import deployedContracts from './contracts/hardhat_contracts.json';
import { useEffect } from 'react';

const targetNetwork = NETWORKS.goerli;

function App() {
  const { isAuthenticated, connectWallet, disconnectWallet, account, userSigner } = useWallet();

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, 'fast', 3000);
  // load your contracts
  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: {} };
  // @ts-ignore
  const writeContracts = useContractLoader(userSigner, contractConfig, 5);
  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice) || undefined;

  // Ensure wallet connects on load (instantly)
  useEffect(() => {
    const initConnect = async () => {
      console.log("initConnect in useEffect");
      await connectWallet();
    };
    initConnect();
  },[]);

  const sendTx = async (assetHash: any, assetId: any, review: any, rating: any) => {
    console.log('Attempting sendTx!');
    const createTx = await writeContracts.HumbleOpinion.create(review, false, assetHash, assetId, parseInt(rating), 1);

    // @ts-ignore
    const result = tx(createTx, (update) => {
      console.log('📡 Transaction Update:', update);
      if (update && (update.status === 'confirmed' || update.status === 1)) {
        console.log(' 🍾 Transaction ' + update.hash + ' finished!');
        console.log(' ⛽️ ' + update.gasUsed + '/' + (update.gasLimit || update.gas) + ' @ ' + parseFloat(update.gasPrice) / 1000000000 + ' gwei');
      }
    });
    console.log('awaiting metamask/web3 confirm result...', result);
    console.log(await result);
  };

  const messageFromContentScript = async (message: any, sender: any, sendResponse: any) => {
    if (message.assetHash) {
      // trigger transaction
      await sendTx(message.assetHash, message.assetId, message.review, message.rating);
      sendResponse({
        message: 'Transaction submitted',
      });
    }
  };

  useEffect(() => {
    chrome.runtime.onMessage.addListener(messageFromContentScript);
    return function cleanup() {
      chrome.runtime.onMessage.removeListener(messageFromContentScript);
    };
  })

  return (
    <div className='App'>
      <header className='App-header'>
        <img src={logo} className='App-logo' alt='logo' />
        <p>{isAuthenticated && 'Connected to: ' + account}</p>
        <p>
          <button onClick={isAuthenticated ? disconnectWallet : connectWallet} id='wallet-connect'>
            {isAuthenticated ? 'Disconnect Wallet' : 'Connect Wallet'}
          </button>
          <button onClick={async () => { await sendTx('xxx', '100', "Btn test", 3); }}>
            Send Tx
          </button>
        </p>
      </header>
    </div>
  );
}

export default App;
