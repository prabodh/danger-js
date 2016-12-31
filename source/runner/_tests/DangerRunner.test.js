// @flow

import { contextForDanger } from "../Dangerfile"
import {
  createDangerfileRuntimeEnvironment,
  runDangerfileEnvironment,
  updateDangerfile,
  cleanDangerfile
} from "../DangerfileRunner"
import Fake from "../../ci_source/providers/Fake"
import FakePlatform from "../../platforms/FakePlatform"
import Executor from "../Executor"

import os from "os"
import fs from "fs"

import { resolve } from "path"
const fixtures = resolve(__dirname, "fixtures")

/**
 * Sets up an example context
 * @returns {Promise<DangerContext>} a context
*/
async function setupDangerfileContext() {
  const platform = new FakePlatform()
  const exec = new Executor(new Fake({}), platform)

  platform.getReviewDiff = jest.fn()
  platform.getReviewInfo = jest.fn()

  const dsl = await exec.dslForDanger()
  return contextForDanger(dsl)
}

describe("with fixtures", () => {
  it("handles a blank Dangerfile", async () => {
    const context = await setupDangerfileContext()
    const runtime = await createDangerfileRuntimeEnvironment(context)
    const results = await runDangerfileEnvironment(resolve(fixtures, "__DangerfileEmpty.js"), runtime)

    expect(results).toEqual({
      fails: [],
      markdowns: [],
      messages: [],
      warnings: []
    })
  })

  it("handles a full set of messages", async () => {
    const context = await setupDangerfileContext()
    const runtime = await createDangerfileRuntimeEnvironment(context)
    const results = await runDangerfileEnvironment(resolve(fixtures, "__DangerfileFullMessages.js"), runtime)

    expect(results).toEqual({
      fails: [{"message": "this is a failure"}],
      markdowns: ["this is a *markdown*"],
      messages: [{"message": "this is a message"}],
      warnings: [{"message": "this is a warning"}]
    })
  })

  it("handles a failing dangerfile", async () => {
    const context = await setupDangerfileContext()
    const runtime = await createDangerfileRuntimeEnvironment(context)

    try {
      await runDangerfileEnvironment(resolve(fixtures, "__DangerfileBadSyntax.js"), runtime)
      throw new Error("Do not get to this")
    }
    catch (e) {
      // expect(e.message === ("Do not get to this")).toBeFalsy()
      expect(e.message).toEqual("hello is not defined")
    }
  })

  it("handles relative imports correctly", async () => {
    const context = await setupDangerfileContext()
    const runtime = await createDangerfileRuntimeEnvironment(context)
    await runDangerfileEnvironment(resolve(fixtures, "__DangerfileImportRelative.js"), runtime)
  })
})

describe("cleaning Dangerfiles", () => {
  it("Supports removing the danger import", () => {
    const path = resolve(os.tmpdir(), "fake_dangerfile_1")
    fs.writeFileSync(path, "import { danger, warn, fail, message } from 'danger'")
    updateDangerfile(path)
    expect(fs.readFileSync(path).toString()).toEqual("// import { danger, warn, fail, message } from 'danger'")
  })

  it("also handles typescript style imports", () => {
    const before = "import danger from 'danger'"
    expect(cleanDangerfile(before)).toEqual("// import danger from 'danger'")
  })
})