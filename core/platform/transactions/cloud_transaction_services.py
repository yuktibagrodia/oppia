# coding: utf-8
#
# Copyright 2014 The Oppia Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Provides a seam for transaction services."""

from __future__ import absolute_import
from __future__ import unicode_literals

import functools

from google.cloud import datastore

from typing import Any, Callable # isort:skip # pylint: disable=unused-import

CLIENT = datastore.Client()


def run_in_transaction_wrapper(fn):
    # type: (Callable[..., Any]) -> Callable[..., Any]
    """Runs a decorated function in a transaction. Either all of the operations
    in the transaction are applied, or none of them are applied.

    If an exception is raised, the transaction is likely not safe to
    commit, since TransactionOptions.ALLOWED is used.

    Returns:
        function. Function wrapped in transaction.

    Raises:
        Exception. Whatever fn() raises.
        datastore_errors.TransactionFailedError. The transaction failed.
    """
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        # type: (*Any, **Any) -> Any
        """Wrapper for the transaction."""
        with CLIENT.transaction():
            return fn(*args, **kwargs)

    return wrapper
