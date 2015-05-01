/**
 * lib/client.js - Module for client-side encryption data.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

data = {
    
    Key: "?EBruStumawRE3pa", // XOR key for client-side encoding.
    
    /**
     * Decrypt data sent from client.
     * @param {String} str - The string to decrypt.
     * @return {String} - The decrypted string.
     */
    Decrypt: function (str) {
        var i, j = 0, buf = "";
        for (i = 0; i < str.length; i++) {
            buf += String.fromCharCode(
                    str.charCodeAt(i) ^ data.Key.charCodeAt(j % data.Key.length));
            j++;
        }
        return buf;
    }
};

module.exports = data;