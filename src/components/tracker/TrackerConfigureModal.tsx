/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import { Button, Col, Input, Modal, Row, Spin } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import { ipcRenderer } from 'electron';
import log from 'electron-log';
import styles from './TrackerConfigureModal.css';
import ipcChannels from '../../constants/ipcChannels.json';
import storeKeys from '../../constants/storeKeys.json';
import persistantStore from '../../util/persistantStore';

type Props = {
  trackerId: string;
  visible: boolean;
  toggleVisible: () => void;
};

const TrackerConfigureModal: React.FC<Props> = (props: Props) => {
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState('');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [username, setUsername] = useState<string | null>(null);

  const loadTrackerDetails = async () => {
    setLoading(true);

    await ipcRenderer
      .invoke(ipcChannels.TRACKER.GET_AUTH_URL, props.trackerId)
      .then((_authUrl: string) => setAuthUrl(_authUrl))
      .catch((e) => log.error(e));

    await ipcRenderer
      .invoke(ipcChannels.TRACKER.GET_USERNAME, props.trackerId)
      .then((_username) => setUsername(_username))
      .catch((e) => log.error(e));

    setLoading(false);
  };

  const saveTrackerDetails = async (_accessToken: string) => {
    setLoading(true);

    persistantStore.write(
      `${storeKeys.TRACKER_ACCESS_TOKEN_PREFIX}${props.trackerId}`,
      _accessToken
    );
    await ipcRenderer
      .invoke(
        ipcChannels.TRACKER.SET_ACCESS_TOKEN,
        props.trackerId,
        _accessToken
      )
      .catch((e) => log.error(e));
    loadTrackerDetails();
  };

  useEffect(() => {
    if (props.trackerId !== '') {
      loadTrackerDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.trackerId]);

  if (loading) {
    return (
      <Modal
        title="Configure Tracker"
        visible={props.visible}
        footer={null}
        onCancel={props.toggleVisible}
      >
        <div className={styles.loaderContainer}>
          <Spin />
          <Paragraph>Reloading tracker details</Paragraph>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Configure Tracker"
      visible={props.visible}
      footer={null}
      onCancel={props.toggleVisible}
    >
      <Row className={styles.row}>
        <Col span={10}>1) Open the authentication page in your browser</Col>
        <Col span={14}>
          <a href={authUrl} target="_blank" rel="noreferrer">
            {authUrl}
          </a>
        </Col>
      </Row>
      <Row className={styles.row}>
        <Col span={10}>2) Copy the token you receive</Col>
        <Col span={14}>
          <Input
            value={accessToken}
            onChange={(e: any) => setAccessToken(e.target.value)}
          />
        </Col>
      </Row>
      <Row className={styles.row}>
        <Col span={10}>3) Save details</Col>
        <Col span={14}>
          <Button onClick={() => saveTrackerDetails(accessToken)}>
            Submit
          </Button>
        </Col>
      </Row>

      {username === null ? (
        <Paragraph className={styles.statusText}>
          You are not currently authenticated.
        </Paragraph>
      ) : (
        <Paragraph className={styles.statusText}>
          Authenticated as {username}.{' '}
          <a onClick={() => saveTrackerDetails('')}>Unlink</a>.
        </Paragraph>
      )}
    </Modal>
  );
};

export default TrackerConfigureModal;
