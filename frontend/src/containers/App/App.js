import React, {Component} from 'react';
import notie from 'notie';
import {AppBar, Divider} from 'material-ui';

import {DEFAULT_CONFIG_STRUCTURE} from '../../defs/bs-config-template';

import {
  RENDERER_INIT,
  RENDERER_TERMINATE,
  RENDERER_START_BS,
  RENDERER_STOP_BS,
  RENDERER_START_PAC,
  RENDERER_STOP_PAC,
  RENDERER_SAVE_CONFIG,
  RENDERER_SET_SYS_PAC,
  RENDERER_SET_SYS_PROXY,
  RENDERER_RESTORE_SYS_PAC,
  RENDERER_RESTORE_SYS_PROXY,
  MAIN_INIT,
  MAIN_ERROR,
  MAIN_TERMINATE,
  MAIN_START_BS,
  MAIN_START_PAC,
  MAIN_STOP_BS,
  MAIN_STOP_PAC,
  MAIN_SET_SYS_PAC
} from '../../defs/events';

import {ScreenMask, ServerItem} from '../../components';
import {ClientDialog, PacDialog, ServerDialog} from '../../dialogs';
import {AppSlider, General, ServerList} from '../../containers';
import './App.css';

const {ipcRenderer} = window.require('electron');

const STATUS_OFF = 0;
const STATUS_RUNNING = 1;
// const STATUS_STARTING = 2;
const STATUS_RESTARTING = 3;

function toast(message) {
  notie.alert({text: message, position: 'bottom', stay: false, time: 5});
}

export class App extends Component {

  state = {
    config: null,
    appStatus: STATUS_OFF,
    pacStatus: STATUS_OFF,
    serverIndex: -1,
    isDisplayDrawer: false,
    isDisplayClientEditor: false,
    isDisplayPACEditor: false,
    isDisplayServerEditor: false
  };

  constructor(props) {
    super(props);
    this.onMenuTouchTap = this.onMenuTouchTap.bind(this);
    this.onBeginAddServer = this.onBeginAddServer.bind(this);
    this.onBeginEditServer = this.onBeginEditServer.bind(this);
    this.onBeginEditClient = this.onBeginEditClient.bind(this);
    this.onBeginEditPAC = this.onBeginEditPAC.bind(this);
    this.onCloseServerEditor = this.onCloseServerEditor.bind(this);
    this.onCloseClientEditor = this.onCloseClientEditor.bind(this);
    this.onClosePACEditor = this.onClosePACEditor.bind(this);
    this.onToggleLocalService = this.onToggleLocalService.bind(this);
    this.onToggleServerEnabled = this.onToggleServerEnabled.bind(this);
    this.onTogglePACEnabled = this.onTogglePACEnabled.bind(this);
    this.onEditServer = this.onEditServer.bind(this);
    this.onEditLocal = this.onEditLocal.bind(this);
    this.onDeleteServer = this.onDeleteServer.bind(this);
    this.onStartApp = this.onStartApp.bind(this);
    this.onStopApp = this.onStopApp.bind(this);
    this.onStartPac = this.onStartPac.bind(this);
    this.onStopPac = this.onStopPac.bind(this);
    this.onSave = this.onSave.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(RENDERER_INIT);
    ipcRenderer.on(MAIN_INIT, (event, {config}) => {
      this.setState({
        config,
        appStatus: config.app_status,
        pacStatus: config.pac_status
      });
    });
    ipcRenderer.on(MAIN_ERROR, (event, err) => {
      switch (err.code) {
        case 'EADDRINUSE':
          toast(`Error: ${err.code} ${err.address}:${err.port}`);
          break;
        default:
          toast(`Error: ${err}`);
          break;
      }
      console.warn(err);
    });
    ipcRenderer.on(MAIN_TERMINATE, () => {
      this.onStopApp();
      ipcRenderer.send(RENDERER_TERMINATE);
    });
    ipcRenderer.on(MAIN_START_BS, () => {
      const {config} = this.state;
      this.setState({
        config: {
          ...config,
          app_status: STATUS_RUNNING
        },
        appStatus: STATUS_RUNNING
      }, this.onSave);
    });
    ipcRenderer.on(MAIN_START_PAC, () => {
      const {config} = this.state;
      this.setState({
        config: {
          ...config,
          pac_status: STATUS_RUNNING
        },
        pacStatus: STATUS_RUNNING
      }, this.onSave);
    });
    ipcRenderer.on(MAIN_STOP_BS, () => {
      const {config} = this.state;
      this.setState({
        config: {
          ...config,
          app_status: STATUS_OFF
        },
        appStatus: STATUS_OFF
      }, this.onSave);
    });
    ipcRenderer.on(MAIN_STOP_PAC, () => {
      const {config} = this.state;
      this.setState({
        config: {
          ...config,
          pac_status: STATUS_OFF
        },
        pacStatus: STATUS_OFF
      }, this.onSave);
    });
    ipcRenderer.on(MAIN_SET_SYS_PAC, () => {
      const {config} = this.state;
      this.setState({
        config: {
          ...config,
          pac_status: STATUS_RUNNING
        },
        pacStatus: STATUS_RUNNING
      }, this.onSave);
    });
  }

  componentWillUmount() {
    this.onStopApp();
  }

  onMenuTouchTap() {
    this.setState({isDisplayDrawer: !this.state.isDisplayDrawer});
  }

  onBeginAddServer() {
    this.setState({isDisplayServerEditor: true, serverIndex: -1});
  }

  onBeginEditServer(index) {
    this.setState({isDisplayServerEditor: true, serverIndex: index});
  }

  onBeginEditClient() {
    this.setState({isDisplayClientEditor: true});
  }

  onBeginEditPAC() {
    this.setState({isDisplayPACEditor: true});
  }

  onCloseServerEditor() {
    this.setState({isDisplayServerEditor: false}, this.onRestartApp);
  }

  onCloseClientEditor() {
    this.setState({isDisplayClientEditor: false}, this.onRestartApp);
  }

  onClosePACEditor() {
    this.setState({isDisplayPACEditor: false}, this.onRestartPac);
  }

  onToggleLocalService() {
    const {appStatus} = this.state;
    if (appStatus === STATUS_RUNNING) {
      this.onStopApp();
    } else {
      this.onStartApp();
    }
  }

  onToggleServerEnabled(index) {
    const {config} = this.state;
    this.setState({
      config: {
        ...config,
        servers: config.servers.map((s, i) => ({
          ...s,
          enabled: (i === index) ? !s.enabled : s.enabled
        }))
      }
    }, this.onRestartApp);
  }

  onTogglePACEnabled() {
    const {config, appStatus, pacStatus} = this.state;
    if (pacStatus === STATUS_RUNNING) {
      ipcRenderer.send(RENDERER_STOP_PAC);
    } else {
      ipcRenderer.send(RENDERER_START_PAC, {url: config.pac});
    }
    if (appStatus === STATUS_RUNNING) {
      this.onRestartApp();
    }
  }

  onEditServer(server) {
    const {config, serverIndex} = this.state;
    if (serverIndex === -1) {
      // add a server
      this.setState({
        serverIndex: config.servers.length,
        config: {
          ...config,
          servers: config.servers.concat(server)
        }
      });
    } else {
      // edit a server
      this.setState({
        config: {
          ...config,
          servers: config.servers.map((s, i) => (i === serverIndex) ? server : s)
        }
      });
    }
  }

  onEditLocal(newConfig) {
    const {config} = this.state;
    this.setState({
      config: {
        ...config,
        ...newConfig
      }
    });
  }

  onDeleteServer(index) {
    const {config} = this.state;
    this.setState({
      config: {
        ...config,
        servers: config.servers.filter((s, i) => i !== index)
      }
    }, this.onRestartApp);
  }

  onSave() {
    const {config, appStatus, pacStatus} = this.state;
    if (config !== null) {
      ipcRenderer.send(RENDERER_SAVE_CONFIG, {
        ...config,
        app_status: appStatus,
        pac_status: pacStatus
      });
    }
  }

  onStartApp() {
    const {appStatus, pacStatus, config} = this.state;
    if (appStatus === STATUS_OFF && appStatus !== STATUS_RESTARTING) {
      // validate config
      if (config.servers.filter((server) => server.enabled).length < 1) {
        toast('You must enable at least one server');
        this.setState({appStatus: STATUS_OFF});
        return;
      }

      // TODO: validate other settings

      // 1. set pac or global proxy and bypass
      if (pacStatus === STATUS_RUNNING) {
        ipcRenderer.send(RENDERER_START_PAC, {url: config.pac});
        ipcRenderer.send(RENDERER_SET_SYS_PAC, {url: config.pac});
      } else {
        ipcRenderer.send(RENDERER_SET_SYS_PROXY, {
          host: config.host,
          port: config.port,
          bypass: config.bypass
        });
      }

      // 2. start blinksocks client
      ipcRenderer.send(RENDERER_START_BS, {config});
    }
  }

  onStopApp() {
    const {appStatus} = this.state;
    if (appStatus === STATUS_RUNNING) {
      // 1. restore all system settings
      ipcRenderer.send(RENDERER_RESTORE_SYS_PAC);
      ipcRenderer.send(RENDERER_RESTORE_SYS_PROXY);

      // 2. terminate blinksocks client
      ipcRenderer.send(RENDERER_STOP_BS);
    }
  }

  onRestartApp() {
    const {appStatus} = this.state;
    if (appStatus === STATUS_RUNNING) {
      this.onStopApp();
      this.setState({appStatus: STATUS_RESTARTING});
      setTimeout(this.onStartApp, 1000);
    }
  }

  onStartPac() {
    const {pacStatus, config} = this.state;
    if (pacStatus === STATUS_OFF && pacStatus !== STATUS_RESTARTING) {
      ipcRenderer.send(RENDERER_START_PAC, {url: config.pac});
    }
  }

  onStopPac() {
    const {pacStatus} = this.state;
    if (pacStatus === STATUS_RUNNING) {
      ipcRenderer.send(RENDERER_STOP_PAC);
    }
  }

  onRestartPac() {
    const {pacStatus} = this.state;
    if (pacStatus === STATUS_RUNNING) {
      this.onStopPac();
      this.setState({pacStatus: STATUS_RESTARTING});
      setTimeout(this.onStartPac, 1000);
    }
  }

  render() {
    const {
      config,
      serverIndex,
      appStatus,
      pacStatus,
      isDisplayDrawer,
      isDisplayClientEditor,
      isDisplayServerEditor,
      isDisplayPACEditor
    } = this.state;

    if (config === null) {
      return (
        <div className="app__loading">Loading</div>
      );
    }

    return (
      <div className="app">
        {isDisplayDrawer && <ScreenMask onTouchTap={this.onMenuTouchTap}/>}
        <AppBar title="blinksocks" onLeftIconButtonTouchTap={this.onMenuTouchTap}/>
        <AppSlider isOpen={isDisplayDrawer}/>
        <General
          config={config}
          appStatus={appStatus}
          pacStatus={pacStatus}
          onToggleClientService={this.onToggleLocalService}
          onTogglePacService={this.onTogglePACEnabled}
          onOpenClientDialog={this.onBeginEditClient}
          onOpenPacDialog={this.onBeginEditPAC}
          onOpenServerDialog={this.onBeginAddServer}
        />
        <Divider/>
        <ServerList
          servers={config.servers}
          getItemComponent={(server, i) => (
            <ServerItem
              key={i}
              server={server}
              onToggleEnabled={this.onToggleServerEnabled.bind(this, i)}
              onEdit={this.onBeginEditServer.bind(this, i)}
              onDelete={this.onDeleteServer.bind(this, i)}
            />
          )}
        />
        <ClientDialog
          isOpen={isDisplayClientEditor}
          config={config}
          onUpdate={this.onEditLocal}
          onConfirm={this.onCloseClientEditor}
          onCancel={() => this.setState({isDisplayClientEditor: false})}
        />
        <PacDialog
          isOpen={isDisplayPACEditor}
          config={config}
          onUpdate={this.onEditLocal}
          onConfirm={this.onClosePACEditor}
          onCancel={() => this.setState({isDisplayPACEditor: false})}
        />
        <ServerDialog
          isOpen={isDisplayServerEditor}
          server={config.servers[serverIndex] || DEFAULT_CONFIG_STRUCTURE.servers[0]}
          serverIndex={serverIndex}
          onUpdate={this.onEditServer}
          onConfirm={this.onCloseServerEditor}
          onCancel={() => this.setState({isDisplayServerEditor: false})}
        />
      </div>
    );
  }

}
