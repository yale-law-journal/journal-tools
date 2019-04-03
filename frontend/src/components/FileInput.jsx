import React, { Component } from 'react';

class FileInput extends Component {
  constructor(props) {
    super(props);
    this.state = { files: [] };
  }

  render() {
    return (
      <div className="custom-file">
        <Form.Control type="file" ref={this.fileInput} accept=".docx" name="doc" />
        <Form.Label className="custom-file-label text-nowrap overflow-hidden" style={{ justifyContent: 'left', cursor: 'pointer' }} onClick={this.fileSelect}>
          { this.state.files ? this.state.files[0].name : 'File...' }
        </Form.Label>
      </div>
    );
  }
}
